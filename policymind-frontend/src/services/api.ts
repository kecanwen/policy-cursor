export interface ShenlunEvalRequest {
  questionId?: string;
  material: string;
  questionPrompt: string;
  standardRubric?: string;
  userAnswer: string;
  wordLimit: number;
}

export interface DiffSuggestion {
  before: string;
  after: string;
  reason: string;
}

export interface BreakpointPayload {
  stage: string;
  detail: string;
}

export interface MemoryCardPayload {
  title: string;
  pattern: string;
  tip: string;
}

export interface XingceDebugRequest {
  questionId?: string;
  question: string;
  options: string[];
  userAnswer: string;
  correctAnswer: string;
  reasoning: string;
  elapsedSeconds: number;
}

export type SsePayload =
  | { type: 'STATUS'; message: string }
  | { type: 'CHUNK'; content: string }
  | ({ type: 'DIFF_SUGGESTION' } & DiffSuggestion)
  | ({ type: 'BREAKPOINT' } & BreakpointPayload)
  | ({ type: 'CARD' } & MemoryCardPayload)
  | { type: 'ERROR'; message: string };

export const API = {
  evaluate: '/api/v1/shenlun/evaluate/stream',
  refactor: '/api/v1/shenlun/refactor/stream',
  xingceDebug: '/api/v1/xingce/debug/stream',
  meta: '/api/v1/meta',
};

export async function fetchMeta(): Promise<{ mockEnabled: boolean; model: string } | null> {
  try {
    const response = await fetch(API.meta);
    if (!response.ok) return null;
    const body = await response.json();
    return body?.data ?? null;
  } catch {
    return null;
  }
}
