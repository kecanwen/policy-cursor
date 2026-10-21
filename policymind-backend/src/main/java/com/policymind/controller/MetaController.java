package com.policymind.controller;

import com.policymind.common.result.Result;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/meta")
public class MetaController {

    private final boolean mockEnabled;
    private final String model;

    public MetaController(
            @Value("${policymind.ai.mock-enabled:true}") boolean mockEnabled,
            @Value("${spring.ai.openai.chat.options.model:deepseek-chat}") String model
    ) {
        this.mockEnabled = mockEnabled;
        this.model = model;
    }

    @GetMapping
    public Result<Map<String, Object>> meta() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("service", "policymind-backend");
        data.put("mockEnabled", mockEnabled);
        data.put("model", model);
        return Result.ok(data);
    }
}
