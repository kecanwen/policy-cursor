-- PolicyMind 持久化模型（MySQL 8.0 / PostgreSQL 可做类型微调）

CREATE TABLE exam_question (
    id VARCHAR(36) PRIMARY KEY,
    type VARCHAR(20) NOT NULL COMMENT 'SHENLUN_SMALL / SHENLUN_BIG / XINGCE',
    category VARCHAR(50) NOT NULL COMMENT '题型：归纳概括/提出对策/综合分析/资料分析等',
    source VARCHAR(100) NOT NULL COMMENT '试题出处，如 2024国考行政执法卷',
    material TEXT NOT NULL COMMENT '给定材料全文',
    prompt TEXT NOT NULL COMMENT '题干作答要求',
    standard_rubric TEXT COMMENT '标准采分细则',
    word_limit INT DEFAULT NULL COMMENT '限制字数，行测题为 NULL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE exam_submission (
    id VARCHAR(36) PRIMARY KEY,
    question_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    user_answer TEXT NOT NULL COMMENT '考生提交的内容',
    word_count INT NOT NULL COMMENT '提交时字数',
    predicted_score DECIMAL(4, 2) COMMENT 'AI 预估得分',
    hit_rate DECIMAL(5, 2) COMMENT '采分点命中百分比',
    diagnostic_report MEDIUMTEXT COMMENT 'AI 返回的完整 Markdown 报告',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_question (user_id, question_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE style_vocabulary_notebook (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    original_text TEXT NOT NULL COMMENT '口语/白话原句',
    refactored_text TEXT NOT NULL COMMENT '润色后的公文风词句',
    action_type VARCHAR(50) COMMENT '词性模式：动宾搭配/排比框架/过渡连词',
    context_notes TEXT COMMENT '应用场景备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
