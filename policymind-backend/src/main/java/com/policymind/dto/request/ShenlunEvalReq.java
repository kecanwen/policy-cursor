package com.policymind.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ShenlunEvalReq(
        String questionId,
        @NotBlank(message = "给定资料不能为空")
        @Size(max = 20000, message = "给定资料过长")
        String material,
        @NotBlank(message = "题干要求不能为空")
        @Size(max = 3000, message = "题干要求过长")
        String questionPrompt,
        @Size(max = 10000, message = "采分点过长")
        String standardRubric,
        @NotBlank(message = "考生作答不能为空")
        @Size(max = 6000, message = "作答内容过长")
        String userAnswer,
        @NotNull(message = "字数限制不能为空")
        @Min(value = 50, message = "字数限制至少为 50")
        @Max(value = 3000, message = "字数限制最大为 3000")
        Integer wordLimit
) {
}
