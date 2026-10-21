package com.policymind.config;

import com.policymind.common.constant.AiConstants;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiModelConfig {

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder) {
        return builder
                .defaultSystem(AiConstants.EXAMINER_SYSTEM_PROMPT)
                .build();
    }
}
