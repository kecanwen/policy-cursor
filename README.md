# PolicyMind · 公考备考 IDE

一个按“双栏沉浸式 IDE”思路实现的公考申论 / 行测工作台。前端是 Umi 4 + React 18 + Ant Design 5，后端是 Spring Boot 3 + Spring AI，流式诊断统一走 SSE。

## 快速启动

```bash
# 1. 后端（默认 8080）
cd policymind-backend
mvn spring-boot:run

# 2. 前端（默认 8000）
cd policymind-frontend
pnpm install
pnpm dev
```

打开 `http://localhost:8000`。前端已把 `/api` 代理到 `http://localhost:8080`。

### 没有模型 Key 也能跑

默认 `POLICYMIND_AI_MOCK=true`，后端使用确定性的演示评卷器：按采分点做关键词命中、按字数给出扣分、生成规范语 Diff 和范文，并以 SSE 流式返回。整条交互链路与真实模型完全一致。

接入真实模型：

```bash
export POLICYMIND_AI_MOCK=false
export AI_BASE_URL=https://api.deepseek.com
export AI_API_KEY=sk-xxx
export AI_MODEL=deepseek-chat
```

任何兼容 OpenAI 协议的服务都可以，通过 `spring.ai.openai.base-url` 切换。

## 已实现的工作台

- **申论双栏工作台**：可拖拽分栏；左侧材料支持划词气泡、要点提取、机关语改写、问题/对策底纹与实体下划线；右侧作答区支持流式与 20 字/行方格纸视图。
- **字数警戒**：按可见字符计数（标点计入、空白不计），剩余 20 字进入橙色收尾区间，超字后红框、抖动、红色计数。
- **SSE 精批**：`fetch + ReadableStream` 解析，`requestAnimationFrame` 合帧刷新，支持中止生成、错误态、重新精批。
- **诊断面板**：得分/命中率/字数总览，采分点穿透表，公文语 Diff 一键采纳，满分范文，原始 Markdown 抽屉。
- **行测思维 Debugger**：先选择、再写排除理由，流式返回思维断点、选项纠偏、翻面秒杀卡，并可收藏到错因库。
- **配套页面**：真题库、错题集、公文词典（支持本地新增卡片）。
- **本地持久化**：当前作答草稿、主题、分栏比例、自定义词典与错因卡写入 `localStorage`。

## 目录

```text
policymind-frontend/
  config/                 Umi 配置、路由、/api 代理
  src/
    components/           MaterialViewer / EssayEditor / RubricTable / DiffAuditor / SseMarkdown
    hooks/                useSSEStream / useWordCounter
    models/               useExamModel / useUserConfig
    pages/                Workspace / XingceDebug / ExamBank / MistakeBook / Dictionary
    services/api.ts       接口契约与类型
    data/                 真题、行测题、词典、错因种子数据
policymind-backend/
  src/main/java/com/policymind/
    controller/           ShenlunController / XingceController / MetaController
    service/              ShenlunService / XingceService / MockShenlunGrader / DiffExtractor
    prompt/               ShenlunPromptHolder / XingcePromptHolder
    dto/                  请求与响应 Schema
    common/               统一 Result、异常处理、常量
  src/main/resources/db/schema.sql
```

## 接口契约

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/v1/shenlun/evaluate/stream` | 申论流式精批，返回 `text/event-stream` |
| POST | `/api/v1/shenlun/refactor/stream` | 划词机关语改写 |
| POST | `/api/v1/xingce/debug/stream` | 行测思维断点诊断 |
| GET | `/api/v1/meta` | 当前模型 / 演示模式 |

申论请求字段：`questionId`、`material`、`questionPrompt`、`standardRubric`、`userAnswer`、`wordLimit`。

SSE 数据帧：

```text
data: {"type":"STATUS","message":"正在解析材料与提取采分要点..."}
data: {"type":"CHUNK","content":"# 📋 申论全维度诊断报告\n..."}
data: {"type":"DIFF_SUGGESTION","before":"搞好部门沟通","after":"健全跨部门统筹协调机制","reason":"..."}
data: [DONE]
```

行测额外使用 `BREAKPOINT` 与 `CARD` 事件承载断点图和记忆卡；两者都是增量事件，不影响申论契约。

## 实现说明

- Spring AI 的 `chatClient.prompt().stream().content()` 直接返回 `Flux<String>`，控制器拼装 `ServerSentEvent<String>` 并保证最后发送 `[DONE]`。
- 真实模型路径会累积完整 Markdown，再通过 `DiffExtractor` 从第 3 节解析出可一键采纳的改写对；演示路径直接生成结构化 Diff。
- 字数统计在前端与演示评卷器中采用同一规则：`code point 计数，排除空白`。
- `schema.sql` 提供试题、作答诊断、词典三张表的物理模型；当前联调链路不依赖数据库，便于直接启动演示。

## 静态检查

```bash
cd policymind-frontend && pnpm typecheck
cd policymind-backend && mvn -q -DskipTests compile
```
