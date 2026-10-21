package com.policymind.service;

import com.policymind.common.constant.AiConstants;
import com.policymind.dto.request.ShenlunEvalReq;
import com.policymind.dto.request.StyleRefactorReq;
import com.policymind.prompt.ShenlunPromptHolder;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
public class ShenlunService {

    private final ChatClient chatClient;
    private final MockShenlunGrader mockGrader;
    private final DiffExtractor diffExtractor;
    private final SseEvents events;
    private final TokenUsageAuditService audit;
    private final boolean mockEnabled;

    public ShenlunService(
            ChatClient chatClient,
            MockShenlunGrader mockGrader,
            DiffExtractor diffExtractor,
            SseEvents events,
            TokenUsageAuditService audit,
            @Value("${policymind.ai.mock-enabled:true}") boolean mockEnabled
    ) {
        this.chatClient = chatClient;
        this.mockGrader = mockGrader;
        this.diffExtractor = diffExtractor;
        this.events = events;
        this.audit = audit;
        this.mockEnabled = mockEnabled;
    }

    public Flux<String> evaluate(ShenlunEvalReq req) {
        return Flux.defer(() -> {
            long startedAt = System.currentTimeMillis();
            audit.begin("shenlun-evaluate", req.questionId());
            audit.recordInput("shenlun-evaluate", req.material().length() + req.userAnswer().length());
            Flux<String> body = mockEnabled ? mockEvaluate(req) : modelEvaluate(req);
            return body.doFinally(signal -> audit.finish("shenlun-evaluate", startedAt, signal.toString()));
        });
    }

    public Flux<String> refactor(StyleRefactorReq req) {
        return Flux.defer(() -> {
            if (mockEnabled) {
                String rewritten = mockGrader.refactor(req.text());
                return Flux.just(events.chunk(rewritten));
            }
            return chatClient.prompt()
                    .system(AiConstants.EXAMINER_SYSTEM_PROMPT)
                    .user(ShenlunPromptHolder.refactorPrompt(req.text(), req.context()))
                    .stream()
                    .content()
                    .map(events::chunk);
        });
    }

    private Flux<String> mockEvaluate(ShenlunEvalReq req) {
        MockShenlunGrader.GradeResult result = mockGrader.grade(req);
        Flux<String> status = Flux.just(events.status("正在解析材料与提取采分要点..."));
        Flux<String> chunks = Flux.fromIterable(chunk(result.report(), 42))
                .delayElements(Duration.ofMillis(16))
                .map(events::chunk);
        Flux<String> diffs = Flux.fromIterable(result.diffs())
                .map(diff -> events.diff(diff.before(), diff.after(), diff.reason()));
        return Flux.concat(status, chunks, diffs);
    }

    private Flux<String> modelEvaluate(ShenlunEvalReq req) {
        StringBuilder buffer = new StringBuilder();
        Flux<String> status = Flux.just(events.status("正在解析材料与提取采分要点..."));
        Flux<String> chunks = Flux.defer(() -> chatClient.prompt()
                        .system(AiConstants.EXAMINER_SYSTEM_PROMPT)
                        .user(ShenlunPromptHolder.evaluatePrompt(req))
                        .stream()
                        .content())
                .doOnNext(buffer::append)
                .map(events::chunk);
        Flux<String> diffs = Flux.defer(() -> Flux.fromIterable(diffExtractor.extract(buffer.toString()))
                .map(diff -> events.diff(diff.before(), diff.after(), diff.reason())));
        return Flux.concat(status, chunks, diffs);
    }

    private List<String> chunk(String text, int size) {
        List<String> chunks = new ArrayList<>();
        for (int start = 0; start < text.length(); start += size) {
            chunks.add(text.substring(start, Math.min(text.length(), start + size)));
        }
        return chunks;
    }
}
