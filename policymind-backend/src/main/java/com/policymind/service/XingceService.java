package com.policymind.service;

import com.policymind.common.constant.AiConstants;
import com.policymind.dto.request.XingceDebugReq;
import com.policymind.prompt.XingcePromptHolder;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
public class XingceService {

    private final ChatClient chatClient;
    private final SseEvents events;
    private final TokenUsageAuditService audit;
    private final boolean mockEnabled;

    public XingceService(
            ChatClient chatClient,
            SseEvents events,
            TokenUsageAuditService audit,
            @Value("${policymind.ai.mock-enabled:true}") boolean mockEnabled
    ) {
        this.chatClient = chatClient;
        this.events = events;
        this.audit = audit;
        this.mockEnabled = mockEnabled;
    }

    public Flux<String> debug(XingceDebugReq req) {
        return Flux.defer(() -> {
            long startedAt = System.currentTimeMillis();
            audit.begin("xingce-debug", req.questionId());
            Flux<String> body = mockEnabled ? mockDebug(req) : modelDebug(req);
            return body.doFinally(signal -> audit.finish("xingce-debug", startedAt, signal.toString()));
        });
    }

    private Flux<String> mockDebug(XingceDebugReq req) {
        String stage = detectStage(req.reasoning());
        String report = mockReport(req, stage);
        Flux<String> chunks = Flux.fromIterable(chunk(report, 38))
                .delayElements(Duration.ofMillis(16))
                .map(events::chunk);
        Flux<String> breakpoint = Flux.just(events.breakpoint(stage, breakpointDetail(req, stage)));
        Flux<String> card = Flux.just(events.card(
                "定义判断 · 外延锁定三步法",
                "先圈主体，再圈行为，最后比对限定词",
                "选项出现同义替换时，先检查主体和限定词是否被偷换。"
        ));
        return Flux.concat(
                Flux.just(events.status("正在回放你的排除路径，定位思维断点...")),
                chunks,
                breakpoint,
                card
        );
    }

    private Flux<String> modelDebug(XingceDebugReq req) {
        return Flux.concat(
                Flux.just(events.status("正在回放你的排除路径，定位思维断点...")),
                Flux.defer(() -> chatClient.prompt()
                                .system(AiConstants.XINGCE_SYSTEM_PROMPT)
                                .user(XingcePromptHolder.debugPrompt(req))
                                .stream()
                                .content())
                        .map(events::chunk),
                Flux.just(events.breakpoint(detectStage(req.reasoning()), breakpointDetail(req, detectStage(req.reasoning())))),
                Flux.just(events.card(
                        "行测 · 断点复盘卡",
                        "先定位断点类型，再回看题干限定词",
                        "不要急着记题解，把这次断点写进错因库，下次同类题先做一次限定词扫描。"
                ))
        );
    }

    private String mockReport(XingceDebugReq req, String stage) {
        StringBuilder md = new StringBuilder();
        md.append("# 🧠 行测思维 Debugger\n\n");
        md.append("### 1. 思维断点定位\n");
        md.append("你在 **").append(req.elapsedSeconds() == null ? 0 : req.elapsedSeconds())
                .append(" 秒** 内选择了 **").append(req.userAnswer())
                .append("**，正确答案是 **").append(req.correctAnswer()).append("**。\n\n");
        String reasoning = req.reasoning() == null || req.reasoning().isBlank()
                ? "你没有留下排除理由，这本身就是第一个断点：靠语感排除，无法复盘。"
                : "你当时的判断是：「" + req.reasoning().trim() + "」。";
        md.append(reasoning).append("\n\n");
        md.append("结合你的排除路径，断点位于 **").append(stage).append("**。");
        md.append("你抓住了材料里的表面关键词，但没有先锁定题干限定的主体与行为边界，导致选项被同义替换后仍然看起来成立。\n\n");

        md.append("### 2. 选项逐项纠偏\n");
        md.append("| 选项 | 判断 | 纠偏 |\n");
        md.append("| :--- | :--- | :--- |\n");
        char letter = 'A';
        for (String option : req.options()) {
            String current = String.valueOf(letter);
            boolean correct = current.equalsIgnoreCase(req.correctAnswer().trim().substring(0, 1));
            boolean chosen = current.equalsIgnoreCase(req.userAnswer().trim().substring(0, 1));
            String verdict = correct ? "✅ 正确" : chosen ? "❌ 你选了它" : "⚪ 可排除";
            String reason = correct
                    ? "主体、行为、限定词三项均与题干吻合，是唯一完整落入定义的选项。"
                    : "存在主体偷换或限定词范围扩大，不能因为出现原词就保留。";
            md.append("| ").append(current).append(". ")
                    .append(option.replace("|", "｜")).append(" | ")
                    .append(verdict).append(" | ").append(reason).append(" |\n");
            letter++;
        }
        md.append("\n### 3. 秒杀技\n");
        md.append("口诀：**先圈主体，再圈行为，最后比对限定词**。\n\n");
        md.append("下次遇到同类题：\n");
        md.append("1. 用 5 秒把题干的主语、动作、限定范围圈出来；\n");
        md.append("2. 逐项做“主体—行为—限定词”三连比对，任何一项被偷换立即排除。\n");
        return md.toString();
    }

    private String detectStage(String reasoning) {
        String text = reasoning == null ? "" : reasoning;
        if (text.contains("充分") || text.contains("必要")) {
            return "充分必要条件倒置";
        }
        if (text.contains("转折") || text.contains("但是") || text.contains("然而")) {
            return "材料主旨转折";
        }
        if (text.contains("主体") || text.contains("对象") || text.contains("谁")) {
            return "选项偷换主体";
        }
        return "概念外延界定";
    }

    private String breakpointDetail(XingceDebugReq req, String stage) {
        return switch (stage) {
            case "充分必要条件倒置" -> "你把“必要条件”当成了“充分条件”，方向一反，选项自然全部变形。";
            case "材料主旨转折" -> "你在转折词之前就下了结论，后半句才是命题人真正想考的限制条件。";
            case "选项偷换主体" -> "你记住了动作，却漏掉了动作的实施主体，选项正是靠这一点完成偷换。";
            default -> "你把概念的外延扩大了：材料只覆盖一类对象，你却在更宽的范围内做判断。";
        };
    }

    private List<String> chunk(String text, int size) {
        List<String> chunks = new ArrayList<>();
        for (int start = 0; start < text.length(); start += size) {
            chunks.add(text.substring(start, Math.min(text.length(), start + size)));
        }
        return chunks;
    }
}
