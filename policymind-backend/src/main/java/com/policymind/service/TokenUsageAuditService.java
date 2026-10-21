package com.policymind.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicLong;

@Service
public class TokenUsageAuditService {

    private static final Logger log = LoggerFactory.getLogger(TokenUsageAuditService.class);

    private final AtomicLong requestCount = new AtomicLong();
    private final AtomicLong inputChars = new AtomicLong();

    public void begin(String scene, String questionId) {
        requestCount.incrementAndGet();
        log.info("AI request started scene={} questionId={}", scene, questionId);
    }

    public void recordInput(String scene, int chars) {
        inputChars.addAndGet(chars);
        log.info("AI request input scene={} chars={} totalRequests={} totalChars={}",
                scene, chars, requestCount.get(), inputChars.get());
    }

    public void finish(String scene, long startedAt, CharSequence outcome) {
        log.info("AI request finished scene={} cost={}ms outcome={}",
                scene, System.currentTimeMillis() - startedAt, outcome);
    }
}
