import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { App } from 'antd';
import { API, type DiffSuggestion, type ShenlunEvalRequest } from '@/services/api';
import { useSSEStream } from '@/hooks/useSSEStream';
import { useWordCounter } from '@/hooks/useWordCounter';
import { useUserConfig } from '@/models/useUserConfig';
import type { ExamQuestion } from '@/data/exams';

export type EditorMode = 'standard' | 'grid';
export type EvalStatus = 'idle' | 'streaming' | 'done' | 'error';

export interface EvalResult {
  status: EvalStatus;
  markdown: string;
  diffs: DiffSuggestion[];
  message: string;
  error?: string;
}

interface ExamModel {
  currentQuestion: ExamQuestion;
  draftContent: string;
  isStreaming: boolean;
  isDirty: boolean;
  evalResult: EvalResult;
  editorMode: EditorMode;
  wordStats: ReturnType<typeof useWordCounter>;
  cursorRef: MutableRefObject<number>;
  focusSignal: number;
  setEditorMode: (mode: EditorMode) => void;
  updateDraft: (text: string) => void;
  triggerEvaluate: () => Promise<void>;
  abortStream: () => void;
  replaceDraftSnippet: (original: string, target: string) => boolean;
  insertSnippet: (text: string) => void;
  loadSampleAnswer: () => void;
  clearDraft: () => void;
}

const ExamModelContext = createContext<ExamModel | null>(null);

function readDraft(id: string) {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(`policymind:draft:${id}`) || '';
}

export function ExamModelProvider({
  question,
  children,
}: {
  question: ExamQuestion;
  children: ReactNode;
}) {
  const { message } = App.useApp();
  const { gridDefault } = useUserConfig();
  const [draftContent, setDraftContent] = useState(() => readDraft(question.id));
  const [editorMode, setEditorMode] = useState<EditorMode>(gridDefault ? 'grid' : 'standard');
  const [focusSignal, setFocusSignal] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalResult>({
    status: 'idle',
    markdown: '',
    diffs: [],
    message: '',
  });
  const cursorRef = useRef(0);
  const { start, abort, isStreaming } = useSSEStream();
  const wordStats = useWordCounter(draftContent, question.wordLimit);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(`policymind:draft:${question.id}`, draftContent);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [draftContent, question.id]);

  const updateDraft = useCallback(
    (text: string) => {
      setDraftContent(text);
      setIsDirty(true);
    },
    [],
  );

  const triggerEvaluate = useCallback(async () => {
    if (!draftContent.trim()) {
      message.warning('先写下你的作答，再提交 AI 精批');
      return;
    }
    if (wordStats.state === 'over') {
      message.warning(`已超出 ${wordStats.count - question.wordLimit} 字，阅卷将按超字扣分`);
    }

    setEvalResult({
      status: 'streaming',
      markdown: '',
      diffs: [],
      message: '正在连接阅卷引擎...',
    });
    setIsDirty(false);

    const payload: ShenlunEvalRequest = {
      questionId: question.id,
      material: question.material.join('\n'),
      questionPrompt: question.prompt,
      standardRubric: question.standardRubric,
      userAnswer: draftContent,
      wordLimit: question.wordLimit,
    };

    await start(API.evaluate, payload, {
      onStatus: (statusMessage) =>
        setEvalResult((current) => ({ ...current, message: statusMessage })),
      onChunk: (delta) =>
        setEvalResult((current) => ({ ...current, markdown: current.markdown + delta })),
      onDiff: (diff) =>
        setEvalResult((current) => ({ ...current, diffs: [...current.diffs, diff] })),
      onError: (error) =>
        setEvalResult((current) => ({
          ...current,
          status: 'error',
          error,
          message: '',
        })),
      onDone: () =>
        setEvalResult((current) =>
          current.status === 'error'
            ? current
            : { ...current, status: 'done', message: '' },
        ),
    });
  }, [draftContent, message, question, start, wordStats]);

  const abortStream = useCallback(() => {
    abort();
  }, [abort]);

  const replaceDraftSnippet = useCallback(
    (original: string, target: string) => {
      const index = draftContent.indexOf(original);
      if (index < 0) return false;
      const next =
        draftContent.slice(0, index) + target + draftContent.slice(index + original.length);
      setDraftContent(next);
      cursorRef.current = index + target.length;
      setFocusSignal((value) => value + 1);
      setIsDirty(true);
      return true;
    },
    [draftContent],
  );

  const insertSnippet = useCallback(
    (raw: string) => {
      const cleaned = raw
        .replace(/\s+/g, '')
        .replace(/^[“"「]|[”"」]$/g, '')
        .replace(/^(某市|某区|该市|该区)[^，。]{0,12}(反映|表示|指出|说)[：:]/g, '')
        .slice(0, 80);
      if (!cleaned) return;
      const position = Math.min(
        Math.max(cursorRef.current, 0),
        draftContent.length,
      );
      const needsSeparator =
        position > 0 && !/[；;，,。！？\s]$/.test(draftContent.slice(0, position));
      const prefix = needsSeparator ? '；' : '';
      const next =
        draftContent.slice(0, position) + prefix + cleaned + draftContent.slice(position);
      setDraftContent(next);
      cursorRef.current = position + prefix.length + cleaned.length;
      setFocusSignal((value) => value + 1);
      setIsDirty(true);
      message.success('已提炼并插入作答区');
    },
    [draftContent, message],
  );

  const loadSampleAnswer = useCallback(() => {
    setDraftContent(question.sampleAnswer);
    cursorRef.current = question.sampleAnswer.length;
    setFocusSignal((value) => value + 1);
    setIsDirty(true);
    message.success('已填入示例作答，可直接提交看诊断效果');
  }, [message, question.sampleAnswer]);

  const clearDraft = useCallback(() => {
    setDraftContent('');
    cursorRef.current = 0;
    setEvalResult({ status: 'idle', markdown: '', diffs: [], message: '' });
    setIsDirty(false);
    window.localStorage.removeItem(`policymind:draft:${question.id}`);
  }, [question.id]);

  const value = useMemo<ExamModel>(
    () => ({
      currentQuestion: question,
      draftContent,
      isStreaming,
      isDirty,
      evalResult,
      editorMode,
      wordStats,
      cursorRef,
      focusSignal,
      setEditorMode,
      updateDraft,
      triggerEvaluate,
      abortStream,
      replaceDraftSnippet,
      insertSnippet,
      loadSampleAnswer,
      clearDraft,
    }),
    [
      question,
      draftContent,
      isStreaming,
      isDirty,
      evalResult,
      editorMode,
      wordStats,
      focusSignal,
      updateDraft,
      triggerEvaluate,
      abortStream,
      replaceDraftSnippet,
      insertSnippet,
      loadSampleAnswer,
      clearDraft,
    ],
  );

  return <ExamModelContext.Provider value={value}>{children}</ExamModelContext.Provider>;
}

export function useExamModel() {
  const context = useContext(ExamModelContext);
  if (!context) {
    throw new Error('useExamModel must be used inside ExamModelProvider');
  }
  return context;
}
