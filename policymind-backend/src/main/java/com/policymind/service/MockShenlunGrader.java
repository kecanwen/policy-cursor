package com.policymind.service;

import com.policymind.dto.request.ShenlunEvalReq;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 确定性演示评卷器：没有真实模型 Key 时也能跑通完整 SSE 链路与前端交互。
 * 真实模型接入后，此实现仅作为 POLICYMIND_AI_MOCK=true 时的降级路径。
 */
@Component
public class MockShenlunGrader {

    private static final Map<String, String> REFACTOR = new LinkedHashMap<>();

    static {
        REFACTOR.put("搞好部门沟通", "健全跨部门统筹协调机制");
        REFACTOR.put("多商量", "建立常态化会商机制");
        REFACTOR.put("抓紧办", "加快办理进度");
        REFACTOR.put("大家一起做", "凝聚多方合力");
        REFACTOR.put("做好服务", "优化服务供给");
        REFACTOR.put("办事快", "提升办理时效");
        REFACTOR.put("跑腿多", "减少群众跑动");
        REFACTOR.put("弄好", "规范完善");
    }

    public record DiffSuggestion(String before, String after, String reason) {
    }

    public record GradeResult(
            String report,
            List<DiffSuggestion> diffs,
            double score,
            double hitRate,
            int wordCount,
            int hitCount,
            int totalPoints
    ) {
    }

    private record Evaluation(int index, String point, String matchedText, String verdict, String analysis) {
    }

    public GradeResult grade(ShenlunEvalReq req) {
        List<String> points = extractPoints(req.standardRubric(), req.material());
        String haystack = normalize(req.userAnswer());
        int wordCount = countChars(req.userAnswer());

        List<Evaluation> evaluations = new ArrayList<>();
        int hits = 0;
        for (int i = 0; i < points.size(); i++) {
            String point = points.get(i);
            List<String> keywords = keywords(point);
            String hitKeyword = keywords.stream()
                    .filter(keyword -> normalize(keyword).length() >= 2)
                    .filter(keyword -> haystack.contains(normalize(keyword)))
                    .findFirst()
                    .orElse(null);
            boolean partial = false;
            if (hitKeyword == null) {
                String head = normalize(point.contains("：") ? point.substring(0, point.indexOf("：")) : point);
                for (int k = 0; k + 2 <= head.length(); k++) {
                    String gram = head.substring(k, k + 2);
                    if (haystack.contains(gram)) {
                        partial = true;
                        break;
                    }
                }
            }
            String matchedText = hitKeyword == null
                    ? (partial ? findClosestSentence(req.userAnswer(), point) : "未体现")
                    : findSentence(req.userAnswer(), hitKeyword);
            String verdict;
            if (hitKeyword != null) {
                verdict = "✅命中";
                hits++;
            } else if (partial) {
                verdict = "⚠️表达不准";
            } else {
                verdict = "❌遗漏";
            }
            int paragraph = 1 + (i % 5);
            String analysis = hitKeyword != null
                    ? "出处：资料第 " + paragraph + " 段；覆盖「" + hitKeyword + "」，动作与对象完整。"
                    : "出处：资料第 " + paragraph + " 段；缺少核心表述「" + firstKeyword(point) + "」，需补足动作主体与落点。";
            evaluations.add(new Evaluation(i + 1, point, matchedText, verdict, analysis));
        }

        double raw = points.isEmpty() ? 6.0 : 10.0 * hits / points.size();
        if (wordCount > req.wordLimit()) {
            raw -= 1.0;
        } else if (wordCount < req.wordLimit() * 0.6) {
            raw -= 0.5;
        }
        double score = Math.max(0.0, Math.min(10.0, Math.round(raw * 10.0) / 10.0));
        double hitRate = points.isEmpty() ? 0 : Math.round(1000.0 * hits / points.size()) / 10.0;

        List<DiffSuggestion> diffs = buildDiffs(req.userAnswer());
        String report = buildReport(req, evaluations, diffs, score, hitRate, wordCount);
        return new GradeResult(report, diffs, score, hitRate, wordCount, hits, points.size());
    }

    public String refactor(String text) {
        String result = text == null ? "" : text.trim();
        for (Map.Entry<String, String> entry : REFACTOR.entrySet()) {
            result = result.replace(entry.getKey(), entry.getValue());
        }
        result = result
                .replace("加强", "强化")
                .replace("提高", "提升")
                .replace("做好", "做优")
                .replace("尽快", "加快")
                .replace("我们", "")
                .trim();
        if (result.isBlank()) {
            return "健全统筹协调机制，推动任务落地见效。";
        }
        return result.endsWith("。") ? result : result + "。";
    }

    private List<String> extractPoints(String rubric, String material) {
        List<String> points = new ArrayList<>();
        if (rubric != null && !rubric.isBlank()) {
            for (String line : rubric.split("\\R")) {
                String cleaned = line.trim()
                        .replaceFirst("^[-*•]\\s*", "")
                        .replaceFirst("^\\d+[.、)]\\s*", "")
                        .trim();
                if (!cleaned.isBlank()) {
                    points.add(cleaned);
                }
            }
        }
        if (points.size() <= 1) {
            String source = points.isEmpty() ? material : points.get(0);
            points = Arrays.stream(source.split("[；;。]"))
                    .map(String::trim)
                    .filter(item -> item.length() >= 6)
                    .limit(5)
                    .toList();
        }
        return points.stream().limit(8).toList();
    }

    private List<String> keywords(String point) {
        Set<String> candidates = new LinkedHashSet<>();
        String head = point;
        String body = point;
        int colon = point.indexOf('：');
        if (colon < 0) {
            colon = point.indexOf(':');
        }
        if (colon > 0) {
            head = point.substring(0, colon);
            body = point.substring(colon + 1);
        }
        candidates.add(head.trim());
        for (String part : body.split("[，,、；;。]")) {
            String trimmed = part.trim();
            if (trimmed.length() >= 2) {
                candidates.add(trimmed);
            }
        }
        return new ArrayList<>(candidates);
    }

    private String firstKeyword(String point) {
        List<String> keywords = keywords(point);
        return keywords.size() > 1 ? keywords.get(1) : keywords.get(0);
    }

    private String findSentence(String answer, String keyword) {
        String normalizedKeyword = normalize(keyword);
        for (String sentence : answer.split("(?<=[。；;！？!?])")) {
            if (normalize(sentence).contains(normalizedKeyword)) {
                return truncate(sentence.trim(), 46);
            }
        }
        return truncate(keyword, 46);
    }

    private String findClosestSentence(String answer, String point) {
        String head = normalize(point.contains("：") ? point.substring(0, point.indexOf("：")) : point);
        String best = "未体现";
        int bestScore = 0;
        for (String sentence : answer.split("(?<=[。；;！？!?])")) {
            String normalized = normalize(sentence);
            int overlap = 0;
            for (int i = 0; i + 2 <= head.length(); i++) {
                if (normalized.contains(head.substring(i, i + 2))) {
                    overlap++;
                }
            }
            if (overlap > bestScore) {
                bestScore = overlap;
                best = truncate(sentence.trim(), 46);
            }
        }
        return bestScore >= 2 ? best : "未体现";
    }

    private List<DiffSuggestion> buildDiffs(String answer) {
        List<DiffSuggestion> diffs = new ArrayList<>();
        for (Map.Entry<String, String> entry : REFACTOR.entrySet()) {
            if (answer.contains(entry.getKey())) {
                diffs.add(new DiffSuggestion(entry.getKey(), entry.getValue(),
                        "将口语化动宾结构升级为可落地的机制性表述"));
            }
        }
        if (diffs.isEmpty() && answer.contains("加强")) {
            diffs.add(new DiffSuggestion("加强", "健全", "单一动词缺少制度载体，改为机制性动词"));
        }
        return diffs.stream().limit(3).toList();
    }

    private String buildReport(
            ShenlunEvalReq req,
            List<Evaluation> evaluations,
            List<DiffSuggestion> diffs,
            double score,
            double hitRate,
            int wordCount
    ) {
        StringBuilder md = new StringBuilder();
        md.append("# 📋 申论全维度诊断报告\n\n");
        md.append("### 1. 得分总览与卷面诊断\n");
        md.append("- **预估得分**：`").append(score).append(" / 10分`\n");
        String wordVerdict = wordCount > req.wordLimit() ? "超字扣分"
                : wordCount < req.wordLimit() * 0.6 ? "字数偏少" : "字数合规";
        md.append("- **字数评估**：实际 ").append(wordCount).append(" 字 / 限制 ")
                .append(req.wordLimit()).append(" 字（").append(wordVerdict).append("）\n");
        md.append("- **采分点命中率**：").append(hitRate).append("%（")
                .append(evaluations.stream().filter(e -> e.verdict.startsWith("✅")).count())
                .append("/").append(evaluations.size()).append("）\n");
        md.append("- **阅卷评语**：").append(comment(score, wordCount, req.wordLimit())).append("\n\n");

        md.append("### 2. 采分点穿透核验表 (材料溯源)\n");
        md.append("| 序号 | 官方采分点/关键词 | 考生作答对应原句 | 判定 | 扣分/失分归因剖析 |\n");
        md.append("| :--- | :--- | :--- | :--- | :--- |\n");
        for (Evaluation evaluation : evaluations) {
            md.append("| ").append(evaluation.index)
                    .append(" | ").append(cell(evaluation.point))
                    .append(" | ").append(cell(evaluation.matchedText))
                    .append(" | ").append(evaluation.verdict)
                    .append(" | ").append(cell(evaluation.analysis))
                    .append(" |\n");
        }
        md.append('\n');

        md.append("### 3. 公文语感 Refactor (程序员白话消除指南)\n");
        if (diffs.isEmpty()) {
            md.append("本答卷公文语感整体较规范，暂无高优先级改写建议。下一步应优先补全遗漏的采分要点。\n\n");
        } else {
            for (DiffSuggestion diff : diffs) {
                md.append("- ❌ **考生原句**：").append(diff.before()).append('\n');
                md.append("- ✅ **规范公文语**：").append(diff.after()).append('\n');
                md.append("- 💡 **改写精要**：").append(diff.reason()).append("\n\n");
            }
        }

        md.append("### 4. 满分考场范文示范\n");
        md.append("```text\n").append(benchmark(evaluations, req.wordLimit())).append("\n```\n");
        return md.toString();
    }

    private String comment(double score, int wordCount, int limit) {
        if (wordCount > limit) {
            return "内容覆盖尚可，但已超出字数红线，申论将直接扣分。先做删减，再补关键动词。";
        }
        if (score >= 8.5) {
            return "采分点覆盖完整，条理清晰；个别表述仍可进一步强化机关语感，向满分卷面收束。";
        }
        if (score >= 6.5) {
            return "主要举措已基本覆盖，但存在归纳层级不齐、部分句子偏口语的问题，缺乏概括高度。";
        }
        return "要点遗漏较多，答案停留在材料复述层面。应先按“主体 + 动作 + 对象 + 效果”重构要点。";
    }

    private String benchmark(List<Evaluation> evaluations, int limit) {
        if (evaluations.isEmpty()) {
            return "一是健全统筹协调机制，明确责任分工；二是优化事项办理流程，压缩办理时限；三是强化数字平台支撑，推动数据共享；四是完善监督评价体系，倒逼服务提质。";
        }
        StringBuilder result = new StringBuilder();
        String[] ordinals = {"一是", "二是", "三是", "四是", "五是", "六是", "七是", "八是"};
        for (int i = 0; i < evaluations.size() && i < ordinals.length; i++) {
            String point = evaluations.get(i).point();
            int colon = point.indexOf('：');
            String core = colon > 0 ? point.substring(colon + 1) : point;
            core = core.split("[，,；;。]")[0].trim();
            if (core.length() > 16) {
                core = core.substring(0, 16);
            }
            if (i > 0) {
                result.append('；');
            }
            result.append(ordinals[i]).append(core);
        }
        result.append('。');
        String text = result.toString();
        if (text.length() > limit) {
            text = text.substring(0, Math.max(0, limit - 1)) + "。";
        }
        return text;
    }

    private int countChars(String text) {
        return (int) text.codePoints().filter(c -> !Character.isWhitespace(c)).count();
    }

    private String normalize(String text) {
        if (text == null) {
            return "";
        }
        return text.replaceAll("[\\s，。；：、！？“”‘’（）()《》【】\\[\\]…—\\-·]", "");
    }

    private String cell(String text) {
        return truncate(text.replace("|", "｜").replace("\n", " ").trim(), 72);
    }

    private String truncate(String text, int max) {
        if (text == null) {
            return "";
        }
        return text.length() <= max ? text : text.substring(0, max) + "…";
    }
}
