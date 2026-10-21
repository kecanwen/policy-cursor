package com.policymind.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record XingceDebugReq(
        String questionId,
        @NotBlank(message = "题干不能为空")
        @Size(max = 6000)
        String question,
        @NotEmpty(message = "选项不能为空")
        List<String> options,
        @NotBlank(message = "考生选择不能为空")
        String userAnswer,
        @NotBlank(message = "正确答案不能为空")
        String correctAnswer,
        @Size(max = 2000, message = "思考说明过长")
        String reasoning,
        @Min(0)
        @Max(3600)
        Integer elapsedSeconds
) {
}
