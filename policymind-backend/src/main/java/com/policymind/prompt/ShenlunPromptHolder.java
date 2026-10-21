package com.policymind.prompt;

import com.policymind.dto.request.ShenlunEvalReq;

public final class ShenlunPromptHolder {

    private static final String EVALUATE_TEMPLATE = """
            你是一名拥有15年阅卷经验的“中央机关及其直属机构公务员录用考试”申论阅卷组长。
            请根据以下给定资料、作答题目要求及标准采分要点，对考生的答案进行全面、严谨、入木三分的结构化诊断。

            【给定资料】：
            {material}

            【题目要求】：
            {questionPrompt}（字数严格限制：{wordLimit} 字以内）

            【官方/专家采分点参考】：
            {standardRubric}

            【考生真实作答】：
            {userAnswer}

            请以结构清晰、层次鲜明的 Markdown 格式进行输出，必须严格包含以下四大核心模块：

            ### 1. 得分总览与卷面诊断
            - **预估得分**：[X] / 10分
            - **字数评估**：实际 [X] 字 / 限制 {wordLimit} 字 [判断：字数合规 / 超字扣分 / 字数偏少]
            - **阅卷评语**：一针见血地指出本答卷的最大短板（如：归纳不全、逻辑混乱、口水话过多、缺乏概括高度）。

            ### 2. 采分点穿透核验表 (材料溯源)
            请以 Markdown 表格逐一比对采分要点：
            | 序号 | 官方采分点/关键词 | 考生作答对应原句 | 判定 | 扣分/失分归因剖析 |
            | :--- | :--- | :--- | :--- | :--- |
            | 1 | [要点1名称] | [考生原句或标明"未体现"] | ✅命中 / ❌遗漏 / ⚠️表达不准 | [注明对应材料第几段内容，缺失了哪个关键动词] |

            ### 3. 公文语感 Refactor (程序员白话消除指南)
            挑选考生作答中典型的“干瘪白话”、“工程逻辑话”或“口语化表述”，给出符合体制内公文习惯的高级改写对比：
            - ❌ **考生原句**：[提取考生的一处口语化句子]
            - ✅ **规范公文语**：[转换后的规范政务公文动宾搭配]
            - 💡 **改写精要**：[剖析改写逻辑，如：将“商量着办”提炼为“建立健全联席协商机制”，强化“统筹、健全、深化、推进”等公文高频规范动词的运用]

            ### 4. 满分考场范文示范
            严格按照本题字数限制（{wordLimit} 字以内），结合材料重新输出一份逻辑完美、采分点全覆盖、具备浓郁机关语感的标杆范文：
            ```text
            [示范范文内容]
            ```
            """;

    private static final String REFACTOR_TEMPLATE = """
            你是机关公文写作专家。请把下面的口语化表达改写为规范、精炼、可写入申论答卷的政务公文表述。
            只输出改写后的句子，不要解释，不要加引号，控制在 40 字以内。

            上下文：{context}
            原句：{text}
            """;

    private ShenlunPromptHolder() {
    }

    public static String evaluatePrompt(ShenlunEvalReq req) {
        return EVALUATE_TEMPLATE
                .replace("{material}", safe(req.material()))
                .replace("{questionPrompt}", safe(req.questionPrompt()))
                .replace("{standardRubric}", blankToDefault(req.standardRubric(),
                        "未提供。请自行从材料中推导 4-6 个可核验的采分要点。"))
                .replace("{userAnswer}", safe(req.userAnswer()))
                .replace("{wordLimit}", String.valueOf(req.wordLimit()));
    }

    public static String refactorPrompt(String text, String context) {
        return REFACTOR_TEMPLATE
                .replace("{text}", safe(text))
                .replace("{context}", blankToDefault(context, "申论归纳概括题作答"));
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }

    private static String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
