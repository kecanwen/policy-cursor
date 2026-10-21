package com.policymind.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class SseEvents {

    private final ObjectMapper objectMapper;

    public SseEvents(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String status(String message) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "STATUS");
        payload.put("message", message);
        return write(payload);
    }

    public String chunk(String content) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "CHUNK");
        payload.put("content", content);
        return write(payload);
    }

    public String diff(String before, String after, String reason) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "DIFF_SUGGESTION");
        payload.put("before", before);
        payload.put("after", after);
        payload.put("reason", reason);
        return write(payload);
    }

    public String breakpoint(String stage, String detail) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "BREAKPOINT");
        payload.put("stage", stage);
        payload.put("detail", detail);
        return write(payload);
    }

    public String card(String title, String pattern, String tip) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "CARD");
        payload.put("title", title);
        payload.put("pattern", pattern);
        payload.put("tip", tip);
        return write(payload);
    }

    public String error(String message) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "ERROR");
        payload.put("message", message);
        return write(payload);
    }

    private String write(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize SSE payload", e);
        }
    }
}
