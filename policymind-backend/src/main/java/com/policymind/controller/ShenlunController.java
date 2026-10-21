package com.policymind.controller;

import com.policymind.dto.request.ShenlunEvalReq;
import com.policymind.dto.request.StyleRefactorReq;
import com.policymind.service.ShenlunService;
import com.policymind.service.SseEvents;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/v1/shenlun")
public class ShenlunController {

    private final ShenlunService shenlunService;
    private final SseEvents events;

    public ShenlunController(ShenlunService shenlunService, SseEvents events) {
        this.shenlunService = shenlunService;
        this.events = events;
    }

    @PostMapping(value = "/evaluate/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> evaluate(@Valid @RequestBody ShenlunEvalReq req) {
        return sse(shenlunService.evaluate(req));
    }

    @PostMapping(value = "/refactor/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> refactor(@Valid @RequestBody StyleRefactorReq req) {
        return sse(shenlunService.refactor(req));
    }

    private Flux<ServerSentEvent<String>> sse(Flux<String> body) {
        Flux<String> safeBody = body.onErrorResume(error ->
                Flux.just(events.error("AI 服务暂时不可用：" + safeMessage(error))));
        return Flux.concat(safeBody, Flux.just("[DONE]"))
                .map(data -> ServerSentEvent.<String>builder().data(data).build());
    }

    private String safeMessage(Throwable error) {
        String message = error.getMessage();
        return message == null || message.isBlank() ? error.getClass().getSimpleName() : message;
    }
}
