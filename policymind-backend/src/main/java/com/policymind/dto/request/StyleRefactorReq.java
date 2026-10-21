package com.policymind.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StyleRefactorReq(
        @NotBlank(message = "待改写文本不能为空")
        @Size(max = 1000, message = "待改写文本过长")
        String text,
        @Size(max = 1000, message = "上下文过长")
        String context
) {
}
