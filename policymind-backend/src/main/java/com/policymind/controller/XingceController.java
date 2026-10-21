package com.policymind.controller;

import com.policymind.dto.request.XingceDebugReq;
import com.policymind.service.SseEvents;
import com.policymind.service.XingceService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/v1/xingce")
public class XingceController {

    private final XingceService xingceService;
    private final SseEvents events;

    public XingceController(XingceService xingceService, SseEvents events) {
        this.xingceService = xingceService;
        this.events = events;
    }

    @PostMapping(value = "/debug/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> debug(@Valid @RequestBody XingceDebugReq req) {
        Flux<String> body = xingceService.debug(req)
                .onErrorResume(error -> Flux.just(events.error(
                        "诊断服务暂时不可用：" + (error.getMessage() == null ? "unknown" : error.getMessage()))));
        return Flux.concat(body, Flux.just("[DONE]"))
                .map(data -> ServerSentEvent.<String>builder().data(data).build());
    }
}
