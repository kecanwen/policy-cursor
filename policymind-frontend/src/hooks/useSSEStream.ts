import { useCallback, useEffect, useRef, useState } from 'react';
import type { SsePayload } from '@/services/api';

export interface SSEHandlers {
  onStatus?: (message: string) => void;
  onChunk?: (delta: string) => void;
  onDiff?: (diff: { before: string; after: string; reason: string }) => void;
  onBreakpoint?: (payload: { stage: string; detail: string }) => void;
  onCard?: (payload: { title: string; pattern: string; tip: string }) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
}

/**
 * fetch + ReadableStream 的 SSE 接收引擎。
 * - 支持 POST JSON Body、AbortController 中断
 * - chunk 先进入缓冲，通过 requestAnimationFrame 合并刷新（≈60fps）
 */
export function useSSEStream() {
  const abortRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const start = useCallback(
    async (url: string, body: unknown, handlers: SSEHandlers) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      let pending = '';
      let rafId = 0;
      let finished = false;

      const flush = () => {
        rafId = 0;
        if (!pending) return;
        const delta = pending;
        pending = '';
        handlers.onChunk?.(delta);
      };

      const schedule = () => {
        if (!rafId) {
          rafId = requestAnimationFrame(flush);
        }
      };

      const finish = (error?: string) => {
        if (finished) return;
        finished = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (pending) {
          const delta = pending;
          pending = '';
          handlers.onChunk?.(delta);
        }
        if (error) handlers.onError?.(error);
        else handlers.onDone?.();
      };

      const dispatch = (raw: string) => {
        const data = raw.trim();
        if (!data) return;
        if (data === '[DONE]' || data === 'DONE') {
          finish();
          return;
        }
        if (data === '[ERROR]' || data === 'ERROR') {
          finish('AI 流式生成中断');
          return;
        }
        try {
          const payload = JSON.parse(data) as SsePayload;
          switch (payload.type) {
            case 'STATUS':
              handlers.onStatus?.(payload.message);
              break;
            case 'CHUNK':
              pending += payload.content;
              schedule();
              break;
            case 'DIFF_SUGGESTION':
              handlers.onDiff?.(payload);
              break;
            case 'BREAKPOINT':
              handlers.onBreakpoint?.(payload);
              break;
            case 'CARD':
              handlers.onCard?.(payload);
              break;
            case 'ERROR':
              finish(payload.message || 'AI 服务异常');
              break;
            default:
              break;
          }
        } catch {
          // 兼容非 JSON 的纯文本流
          pending += data;
          schedule();
        }
      };

      const handleBlock = (block: string) => {
        const dataLines = block
          .split('\n')
          .map((line) => line.trimEnd())
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).replace(/^ /, ''));
        if (dataLines.length) {
          dispatch(dataLines.join('\n'));
        }
      };

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          let detail = '';
          try {
            const json = await response.json();
            detail = json?.message || JSON.stringify(json);
          } catch {
            detail = await response.text().catch(() => '');
          }
          finish(detail || `请求失败（HTTP ${response.status}）`);
          return;
        }
        if (!response.body) {
          finish('当前浏览器不支持流式响应');
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
          let boundary = buffer.indexOf('\n\n');
          while (boundary >= 0) {
            handleBlock(buffer.slice(0, boundary));
            buffer = buffer.slice(boundary + 2);
            boundary = buffer.indexOf('\n\n');
          }
        }
        buffer += decoder.decode();
        if (buffer.trim()) handleBlock(buffer);
        finish();
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') {
          finish();
        } else {
          finish(
            '无法连接精批服务。请确认本地后端已在 8080 端口启动。',
          );
        }
      } finally {
        setIsStreaming(false);
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [],
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  return { start, abort, isStreaming };
}
