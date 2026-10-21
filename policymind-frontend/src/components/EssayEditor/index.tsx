import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { CheckOutlined, LayoutOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Progress, Segmented, Tooltip } from 'antd';
import { useExamModel } from '@/models/useExamModel';
import './style.less';

export default function EssayEditor() {
  const {
    currentQuestion,
    draftContent,
    updateDraft,
    wordStats,
    editorMode,
    setEditorMode,
    focusSignal,
    cursorRef,
    loadSampleAnswer,
  } = useExamModel();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gridWrapRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(19);
  const [shake, setShake] = useState(false);
  const wasOver = useRef(false);

  useEffect(() => {
    if (!focusSignal) return;
    const frame = requestAnimationFrame(() => {
      const element = textareaRef.current;
      if (!element) return;
      element.focus();
      const caret = Math.min(cursorRef.current, element.value.length);
      element.setSelectionRange(caret, caret);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusSignal, cursorRef]);

  useEffect(() => {
    if (editorMode !== 'grid') return;
    const element = gridWrapRef.current;
    if (!element) return;
    const update = () => {
      const width = element.clientWidth - 28;
      setCellSize(Math.max(14, Math.min(21, Math.floor(width / 20))));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [editorMode]);

  useEffect(() => {
    const isOver = wordStats.state === 'over';
    if (isOver && !wasOver.current) {
      setShake(true);
      const timer = window.setTimeout(() => setShake(false), 420);
      wasOver.current = isOver;
      return () => window.clearTimeout(timer);
    }
    wasOver.current = isOver;
    return undefined;
  }, [wordStats.state]);

  const progressColor =
    wordStats.state === 'over'
      ? 'var(--pm-danger)'
      : wordStats.state === 'warning'
        ? 'var(--pm-warning)'
        : 'var(--pm-primary)';

  const lineCount = Math.max(8, Math.ceil(draftContent.length / 20) + 2);

  const handleStandardKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }
    const element = event.currentTarget;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const lineStart = element.value.lastIndexOf('\n', start - 1) + 1;
    const currentLine = element.value.slice(lineStart, start);
    if (!currentLine.trim()) {
      return;
    }
    event.preventDefault();
    const indent = '\n\u3000\u3000';
    const next = element.value.slice(0, start) + indent + element.value.slice(end);
    updateDraft(next);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + indent.length, start + indent.length);
    });
  };

  return (
    <section
      className={`pm-editor ${shake ? 'pm-shake' : ''} ${
        wordStats.state === 'over' ? 'is-over' : ''
      }`}
    >
      <header className="pm-editor__head">
        <div className="pm-editor__heading">
          <span className="pm-editor__title">作答区</span>
          <Tooltip title="按 Ctrl / ⌘ + Enter 可直接提交">
            <span className="pm-editor__shortcut">⌘ ↵ 提交</span>
          </Tooltip>
        </div>
        <Segmented
          size="small"
          value={editorMode}
          onChange={(value) => setEditorMode(value as 'standard' | 'grid')}
          options={[
            { label: '流式', value: 'standard' },
            {
              label: (
                <span>
                  <LayoutOutlined /> 方格纸
                </span>
              ),
              value: 'grid',
            },
          ]}
        />
      </header>

      <div className="pm-editor__prompt">
        <span className="pm-editor__prompt-label">本题</span>
        <span className="pm-editor__prompt-text">{currentQuestion.prompt}</span>
      </div>

      {editorMode === 'standard' ? (
        <div className="pm-editor__standard">
          <textarea
            ref={textareaRef}
            value={draftContent}
            onChange={(event) => updateDraft(event.target.value)}
            onSelect={(event) => {
              cursorRef.current = event.currentTarget.selectionStart;
            }}
            onKeyDown={handleStandardKeyDown}
            placeholder="在这里组织你的答案：先总括，再分条。动词要准，对象要全。"
            spellCheck={false}
            className="pm-essay pm-editor__textarea"
          />
        </div>
      ) : (
        <div
          className="pm-grid-wrap"
          ref={gridWrapRef}
          style={
            {
              '--cell-w': `${cellSize}px`,
              '--cell-h': `${cellSize + 9}px`,
              height: `${lineCount * (cellSize + 9) + 28}px`,
            } as CSSProperties
          }
        >
          <textarea
            ref={textareaRef}
            value={draftContent}
            onChange={(event) => updateDraft(event.target.value)}
            onSelect={(event) => {
              cursorRef.current = event.currentTarget.selectionStart;
            }}
            placeholder="20 字 / 行，按卷面节奏组织答案"
            spellCheck={false}
            className="pm-essay pm-grid-editor"
            style={{
              fontSize: cellSize,
              lineHeight: `${cellSize + 9}px`,
              width: cellSize * 20,
            }}
          />
        </div>
      )}

      {draftContent.length === 0 && (
        <div className="pm-editor__empty-hint">
          <ThunderboltOutlined />
          从材料中划选要点，或
          <button type="button" onClick={loadSampleAnswer}>
            填入示例作答
          </button>
          体验完整精批
        </div>
      )}

      <footer className="pm-editor__foot">
        <div className={`pm-word-count pm-word-count--${wordStats.state}`}>
          <span className="pm-word-count__label">字数</span>
          <strong>{wordStats.count}</strong>
          <span className="pm-word-count__limit">/ {currentQuestion.wordLimit}</span>
          {wordStats.state === 'over' ? (
            <span className="pm-word-count__hint">
              超出 {wordStats.count - currentQuestion.wordLimit} 字 · 直接扣分
            </span>
          ) : wordStats.state === 'warning' ? (
            <span className="pm-word-count__hint">进入收尾区间</span>
          ) : (
            <span className="pm-word-count__hint">
              还可写 {Math.max(0, currentQuestion.wordLimit - wordStats.count)} 字
            </span>
          )}
        </div>
        <div className="pm-editor__foot-right">
          {editorMode === 'grid' && (
            <span className="pm-editor__grid-meta">
              <CheckOutlined /> 20 字 / 行
            </span>
          )}
          <Progress
            type="circle"
            size={28}
            percent={wordStats.percent}
            strokeColor={progressColor}
            trailColor="var(--pm-border)"
            format={() => ''}
            strokeWidth={9}
          />
        </div>
      </footer>
    </section>
  );
}
