package com.policymind.dto.response;

public record RubricItemDTO(
        int index,
        String point,
        String matchedText,
        String verdict,
        String analysis
) {
}
