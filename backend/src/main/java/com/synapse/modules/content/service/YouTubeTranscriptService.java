package com.synapse.modules.content.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.parser.Parser;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class YouTubeTranscriptService {

    private final ObjectMapper objectMapper;

    private static final HttpClient YOUTUBE_HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    private static final int TRANSCRIPT_MAX_CHARS = 2200;

    /**
     * Builds a capture text for YouTube using oEmbed metadata and transcript when available.
     */
    public String buildCaptureText(String watchUrl, String preferredLanguage) {
        try {
            String enc = URLEncoder.encode(watchUrl, StandardCharsets.UTF_8);
            String oembed = "https://www.youtube.com/oembed?format=json&url=" + enc;
            String body = httpGet(oembed);
            JsonNode root = objectMapper.readTree(body);
            String title = root.path("title").asText("").trim();
            String author = root.path("author_name").asText("").trim();
            String videoId = extractVideoId(watchUrl);
            String transcript = videoId != null ? fetchTranscript(videoId, preferredLanguage) : "";
            if (title.isEmpty() && author.isEmpty() && transcript.isBlank()) {
                return "";
            }
            StringBuilder sb = new StringBuilder();
            sb.append("YouTube video capture.\n");
            if (!title.isEmpty()) {
                sb.append("Video title: ").append(title).append('\n');
            }
            if (!author.isEmpty()) {
                sb.append("Channel: ").append(author).append('\n');
            }
            if (!transcript.isBlank()) {
                sb.append("\nTranscript excerpt:\n").append(transcript).append('\n');
            } else {
                sb.append("\nTranscript unavailable for this video/captions setup.\n");
            }
            sb.append("URL: ").append(watchUrl);
            return sb.toString();
        } catch (Exception e) {
            log.warn("YouTube metadata/transcript failed for {}: {}", watchUrl, e.getMessage());
            return "";
        }
    }

    private String fetchTranscript(String videoId, String preferredLanguage) {
        for (String lang : transcriptLanguageOrder(preferredLanguage)) {
            for (String kind : List.of("", "&kind=asr")) {
                String uri = "https://www.youtube.com/api/timedtext?fmt=vtt&v=" + videoId + "&lang=" + lang + kind;
                try {
                    String body = httpGet(uri);
                    String txt = transcriptTextFromTimedText(body);
                    if (!txt.isBlank()) {
                        return txt.length() > TRANSCRIPT_MAX_CHARS ? txt.substring(0, TRANSCRIPT_MAX_CHARS) : txt;
                    }
                } catch (Exception ignore) {
                    // Try next language/track.
                }
            }
        }
        return "";
    }

    private static List<String> transcriptLanguageOrder(String preferredLanguage) {
        String p = preferredLanguage == null ? "" : preferredLanguage.trim().toLowerCase(Locale.ROOT);
        LinkedHashSet<String> ordered = new LinkedHashSet<>();
        if (!p.isBlank()) {
            ordered.add(p);
            if (p.contains("-")) {
                ordered.add(p.substring(0, p.indexOf('-')));
            } else if ("en".equals(p)) {
                ordered.add("en-US");
            } else if ("es".equals(p)) {
                ordered.add("es-ES");
            }
        }
        ordered.add("en");
        ordered.add("es");
        ordered.add("en-US");
        ordered.add("es-ES");
        return new ArrayList<>(ordered);
    }

    private static String transcriptTextFromTimedText(String body) {
        if (body == null || body.isBlank()) {
            return "";
        }
        if (body.startsWith("WEBVTT")) {
            return normalizeWhitespace(
                    body.replaceAll("(?m)^WEBVTT\\s*", "")
                            .replaceAll("(?m)^\\d{2}:\\d{2}:\\d{2}\\.\\d{3}\\s+-->\\s+\\d{2}:\\d{2}:\\d{2}\\.\\d{3}\\s*", "")
            );
        }
        Document xml = Jsoup.parse(body, "", Parser.xmlParser());
        String joined = xml.select("text").eachText().stream()
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .reduce((a, b) -> a + " " + b)
                .orElse("");
        return normalizeWhitespace(joined);
    }

    private static String extractVideoId(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String u = url.trim();
        int q = u.indexOf("v=");
        if (q >= 0) {
            String rest = u.substring(q + 2);
            int amp = rest.indexOf('&');
            return (amp >= 0 ? rest.substring(0, amp) : rest).trim();
        }
        int be = u.indexOf("youtu.be/");
        if (be >= 0) {
            String rest = u.substring(be + "youtu.be/".length());
            int qIdx = rest.indexOf('?');
            return (qIdx >= 0 ? rest.substring(0, qIdx) : rest).trim();
        }
        return null;
    }

    private static String httpGet(String uri) throws IOException, InterruptedException {
        HttpRequest req = HttpRequest.newBuilder(URI.create(uri))
                .GET()
                .header("User-Agent", "Mozilla/5.0 (compatible; Synapse/1.0)")
                .timeout(Duration.ofSeconds(12))
                .build();
        HttpResponse<String> res = YOUTUBE_HTTP.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() < 200 || res.statusCode() >= 300) {
            throw new IOException("HTTP " + res.statusCode());
        }
        return res.body();
    }

    private static String normalizeWhitespace(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim().replaceAll("\\s+", " ");
    }
}
