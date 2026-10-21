package com.policymind.service;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 从模型输出的“公文语感 Refactor”段落中提取可一键采纳的改写对。
 */
@Component
public class DiffExtractor {

    private static final Pattern BEFORE = Pattern.compile("❌\\s*\\*{0,2}考生原句\\*{0,2}\\s*[：:]\\s*(.+)");
    private static final Pattern AFTER = Pattern.compile("✅\\s*\\*{0,2}规范公文语\\*{0,2}\\s*[：:]\\s*(.+)");
    private static final Pattern REASON = Pattern.compile("💡\\s*\\*{0,2}改写精要\\*{0,2}\\s*[：:]\\s*(.+)");

    public record Suggestion(String before, String after, String reason) {
    }

    public List<Suggestion> extract(String markdown) {
        List<Suggestion> result = new ArrayList<>();
        if (markdown == null || markdown.isBlank()) {
            return result;
        }
        String before = null;
        for (String rawLine : markdown.split("\\R")) {
            String line = rawLine.trim();
            Matcher beforeMatcher = BEFORE.matcher(line);
            if (beforeMatcher.find()) {
                before = clean(beforeMatcher.group(1));
                continue;
            }
            Matcher afterMatcher = AFTER.matcher(line);
            if (afterMatcher.find() && before != null) {
                String after = clean(afterMatcher.group(1));
                String reason = "提升动词权威度与规范度";
                Matcher reasonMatcher = REASON.matcher(line);
                if (reasonMatcher.find()) {
                    reason = clean(reasonMatcher.group(1));
                }
                if (!after.isBlank()) {
                    result.add(new Suggestion(before, after, reason));
                }
                before = null;
            }
        }
        return result;
    }

    private String clean(String value) {
        return value
                .replace("**", "")
                .replace("`", "")
                .replace("「", "")
                .replace("」", "")
                .trim();
    }
}
