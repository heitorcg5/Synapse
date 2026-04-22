package com.synapse.modules.knowledge.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import com.synapse.modules.knowledge.dto.KnowledgeExportFile;
import com.synapse.modules.knowledge.dto.KnowledgeItemResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class KnowledgeExportService {

    private static final MediaType MARKDOWN_UTF8 = new MediaType("text", "markdown", StandardCharsets.UTF_8);

    private final KnowledgeService knowledgeService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<KnowledgeItemResponse> loadExportRows(UUID userId) {
        return knowledgeService.listByUser(userId, null, null, null, null, null, null);
    }

    @Transactional(readOnly = true)
    public KnowledgeExportFile exportAll(UUID userId, String format) {
        List<KnowledgeItemResponse> items = loadExportRows(userId);
        return switch (format) {
            case "markdown" -> new KnowledgeExportFile(
                    markdownForItems(items, "Synapse knowledge export"),
                    MARKDOWN_UTF8,
                    "synapse-knowledge.md");
            case "json" -> new KnowledgeExportFile(
                    jsonForItems(items),
                    MediaType.APPLICATION_JSON,
                    "synapse-knowledge.json");
            case "pdf" -> new KnowledgeExportFile(
                    pdfForItems(items, "Synapse knowledge export"),
                    MediaType.APPLICATION_PDF,
                    "synapse-knowledge.pdf");
            default -> throw new IllegalArgumentException("Unsupported export format: " + format);
        };
    }

    @Transactional(readOnly = true)
    public KnowledgeExportFile exportOne(UUID userId, UUID itemId, String format) {
        KnowledgeItemResponse item = knowledgeService.getById(itemId, userId);
        String base = buildBasename(item);
        String docHeading = singleDocHeading(item);
        return switch (format) {
            case "markdown" -> new KnowledgeExportFile(
                    markdownForItems(List.of(item), docHeading),
                    MARKDOWN_UTF8,
                    base + ".md");
            case "json" -> new KnowledgeExportFile(
                    jsonForSingle(item),
                    MediaType.APPLICATION_JSON,
                    base + ".json");
            case "pdf" -> new KnowledgeExportFile(
                    pdfForItems(List.of(item), docHeading),
                    MediaType.APPLICATION_PDF,
                    base + ".pdf");
            default -> throw new IllegalArgumentException("Unsupported export format: " + format);
        };
    }

    private byte[] markdownForItems(List<KnowledgeItemResponse> items, String documentHeading) {
        StringBuilder md = new StringBuilder();
        md.append("# ").append(escapeMarkdownHeading(documentHeading)).append("\n\n");
        md.append("_Generated: ").append(Instant.now()).append("_\n\n");
        for (KnowledgeItemResponse item : items) {
            appendMarkdownNoteBlock(md, item);
        }
        return md.toString().getBytes(StandardCharsets.UTF_8);
    }

    private void appendMarkdownNoteBlock(StringBuilder md, KnowledgeItemResponse item) {
        String title = item.getTitle() != null && !item.getTitle().isBlank()
                ? item.getTitle()
                : "(untitled)";
        md.append("## ").append(escapeMarkdownHeading(title)).append("\n\n");
        md.append("- **Knowledge id**: `").append(item.getId()).append("`\n");
        md.append("- **Inbox item id**: `").append(item.getInboxItemId()).append("`\n");
        if (item.getInboxUploadedAt() != null) {
            md.append("- **Captured at**: ").append(item.getInboxUploadedAt()).append("\n");
        }
        if (item.getSourceContentType() != null && !item.getSourceContentType().isBlank()) {
            md.append("- **Type**: ").append(item.getSourceContentType()).append("\n");
        }
        if (item.getLanguage() != null && !item.getLanguage().isBlank()) {
            md.append("- **Language**: ").append(item.getLanguage()).append("\n");
        }
        if (item.getFolderName() != null && !item.getFolderName().isBlank()) {
            md.append("- **Folder**: ").append(item.getFolderName()).append("\n");
        }
        if (item.getTags() != null && !item.getTags().isEmpty()) {
            md.append("- **Tags**: ").append(String.join(", ", item.getTags())).append("\n");
        }
        md.append("\n");
        if (item.getSummary() != null && !item.getSummary().isBlank()) {
            md.append("### Summary\n\n");
            md.append(item.getSummary().trim()).append("\n\n");
        }
        if (item.getBody() != null && !item.getBody().isBlank()) {
            md.append("### Body\n\n");
            md.append(item.getBody().trim()).append("\n\n");
        }
        md.append("---\n\n");
    }

    private byte[] jsonForItems(List<KnowledgeItemResponse> items) {
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(items);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialize knowledge export", e);
        }
    }

    private byte[] jsonForSingle(KnowledgeItemResponse item) {
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(item);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialize knowledge export", e);
        }
    }

    private byte[] pdfForItems(List<KnowledgeItemResponse> items, String documentTitle) {
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14f);
        Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 11f);
        Font metaFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 9f);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try {
            Document document = new Document();
            PdfWriter.getInstance(document, baos);
            document.open();
            document.add(new Paragraph(documentTitle, titleFont));
            document.add(new Paragraph("Generated: " + Instant.now(), metaFont));
            document.add(new Paragraph(" "));

            for (KnowledgeItemResponse item : items) {
                String title = item.getTitle() != null && !item.getTitle().isBlank()
                        ? item.getTitle()
                        : "(untitled)";
                document.add(new Paragraph(title, titleFont));
                StringBuilder meta = new StringBuilder();
                meta.append("id=").append(item.getId());
                if (item.getInboxUploadedAt() != null) {
                    meta.append(" · captured=").append(item.getInboxUploadedAt());
                }
                if (item.getSourceContentType() != null) {
                    meta.append(" · type=").append(item.getSourceContentType());
                }
                document.add(new Paragraph(meta.toString(), metaFont));
                if (item.getTags() != null && !item.getTags().isEmpty()) {
                    document.add(new Paragraph("Tags: " + String.join(", ", item.getTags()), metaFont));
                }
                if (item.getSummary() != null && !item.getSummary().isBlank()) {
                    document.add(new Paragraph("Summary", bodyFont));
                    document.add(new Paragraph(item.getSummary().trim(), bodyFont));
                }
                if (item.getBody() != null && !item.getBody().isBlank()) {
                    document.add(new Paragraph("Body", bodyFont));
                    document.add(new Paragraph(item.getBody().trim(), bodyFont));
                }
                document.add(new Paragraph(" "));
            }
            document.close();
        } catch (DocumentException e) {
            throw new IllegalStateException("Could not build PDF export", e);
        }
        return baos.toByteArray();
    }

    private static String singleDocHeading(KnowledgeItemResponse item) {
        if (item.getTitle() != null && !item.getTitle().isBlank()) {
            return item.getTitle().trim();
        }
        return "Synapse note";
    }

    /**
     * ASCII-safe basename for Content-Disposition (no path segments).
     */
    static String buildBasename(KnowledgeItemResponse item) {
        String raw = item.getTitle() != null && !item.getTitle().isBlank()
                ? item.getTitle().replaceAll("[^a-zA-Z0-9._-]+", "_").replaceAll("^_+|_+$", "")
                : "";
        if (raw.length() > 48) {
            raw = raw.substring(0, 48);
        }
        if (raw.isBlank()) {
            raw = "note";
        }
        return raw + "-" + item.getId().toString().substring(0, 8);
    }

    private static String escapeMarkdownHeading(String title) {
        return title.replace("\r", " ").replace("\n", " ").trim();
    }
}
