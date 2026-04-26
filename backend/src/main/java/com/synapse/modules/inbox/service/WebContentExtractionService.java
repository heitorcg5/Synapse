package com.synapse.modules.inbox.service;

import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class WebContentExtractionService {

    private static final int URL_FETCH_TIMEOUT_MS = 10_000;
    private static final int READABLE_BLOCK_MIN_CHARS = 140;
    private static final int READABLE_PARAGRAPH_MIN_CHARS = 60;

    /**
     * Fetches a URL and extracts the most readable text block we can find.
     */
    public String fetchReadableText(String url) {
        try {
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (compatible; Synapse/1.0)")
                    .timeout(URL_FETCH_TIMEOUT_MS)
                    .followRedirects(true)
                    .get();

            doc.select("script, style, nav, footer, header, aside, noscript").remove();
            String text = bestReadableText(doc);
            if (!text.isBlank()) {
                return text;
            }
            return doc.title() != null ? doc.title() : "";
        } catch (Exception e) {
            log.warn("Could not fetch URL {}: {}", url, e.getMessage());
            return "";
        }
    }

    private static String bestReadableText(Document doc) {
        Elements preferred = doc.select("article, main, [role=main], .content, .post, .article, .entry-content");
        String preferredText = preferred.stream()
                .map(e -> normalizeWhitespace(e.text()))
                .filter(t -> t.length() >= READABLE_BLOCK_MIN_CHARS)
                .max((a, b) -> Integer.compare(a.length(), b.length()))
                .orElse("");
        if (!preferredText.isBlank()) {
            return preferredText;
        }

        String paragraphAggregate = doc.select("p").stream()
                .map(e -> normalizeWhitespace(e.text()))
                .filter(t -> t.length() >= READABLE_PARAGRAPH_MIN_CHARS)
                .reduce((a, b) -> a + "\n\n" + b)
                .orElse("");
        if (!paragraphAggregate.isBlank()) {
            return paragraphAggregate;
        }

        return normalizeWhitespace(doc.body() != null ? doc.body().text() : "");
    }

    private static String normalizeWhitespace(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim().replaceAll("\\s+", " ");
    }
}
