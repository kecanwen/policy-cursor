package com.policymind.prompt;

import com.policymind.dto.request.XingceDebugReq;

import java.util.stream.Collectors;

public final class XingcePromptHolder {

    private static final String DEBUG_TEMPLATE = """
            请以“思维 Debugger”的方式诊断下面这道行测题。

            【题干】
            {question}

            【选项】
            {options}

            【考生选择】{userAnswer}
            【正确答案】{correctAnswer}
            【耗时】{elapsedSeconds} 秒
            【考生的排除理由】
            {reasoning}

            请输出 Markdown，包含：
            ### 1. 思维断点定位
            明确指出断点发生在“概念外延界定 / 充分必要条件倒置 / 材料主旨转折 / 选项偷换主体”中的哪一类，并引用考生原话佐证。
            ### 2. 选项逐项纠偏
            用一个表格对比每个选项为什么对、为什么错。
            ### 3. 秒杀技
            给出一句可迁移的考场口诀，以及下次遇到同类题的 2 步操作。
            不要给冗长的题解，重点是纠偏。
            """;

    private XingcePromptHolder() {
    }

    public static String debugPrompt(XingceDebugReq req) {
        String options = req.options().stream()
                .map(option -> "- " + option)
                .collect(Collectors.joining("\n"));
        return DEBUG_TEMPLATE
                .replace("{question}", req.question())
                .replace("{options}", options)
                .replace("{userAnswer}", req.userAnswer())
                .replace("{correctAnswer}", req.correctAnswer())
                .replace("{elapsedSeconds}", String.valueOf(req.elapsedSeconds() == null ? 0 : req.elapsedSeconds()))
                .replace("{reasoning}", req.reasoning() == null || req.reasoning().isBlank()
                        ? "考生未填写，请从选项本身反推最可能的误区。" : req.reasoning());
    }
}
