import { useEffect, useRef, useState } from 'react';
import {
  CheckOutlined,
  FontSizeOutlined,
  HighlightOutlined,
  LoadingOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { App, Button, Divider } from 'antd';
import { useExamModel } from '@/models/useExamModel';
import { useSSEStream } from '@/hooks/useSSEStream';
import { API } from '@/services/api';
import './style.less';

interface SelectionPopover {
  x: number;
  y: number;
  text: string;
}

interface RewriteState {
  loading: boolean;
  text: string;
  error?: string;
}

const PROBLEM_PATTERN =
  /(问题|不足|困难|滞后|缺位|短板|堵点|跑多次|繁琐|紧张|反对|搁置|损坏|无人|缺乏|负担|挤占|偏差|形式主义|弄虚作假)/;
const SOLUTION_PATTERN =
  /(推动|建立|完善|优化|强化|依托|实行|推行|设立|组建|健全|整合|建设|探索|要求|清理|取消|培育|统筹|压缩|实现|公开|明确)/;
const ENTITY_PATTERN =
  /^(某市|某区|该市|该县|某镇|某新能源项目|政务服务中心|\d+\s*个部门)$/;

export default function MaterialViewer() {
  const { message } = App.useApp();
  const { currentQuestion, insertSnippet } = useExamModel();
  const [showProblems, setShowProblems] = useState(true);
  const [showSolutions, setShowSolutions] = useState(true);
  const [showEntities, setShowEntities] = useState(true);
  const [fontSize, setFontSize] = useState(15);
  const [popover, setPopover] = useState<SelectionPopover | null>(null);
  const [rewrite, setRewrite] = useState<RewriteState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { start, isStreaming } = useSSEStream();

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.pm-selection-popover')) {
        setPopover(null);
        setRewrite(null);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const text = selection.toString().trim();
    if (text.length < 2 || text.length > 160) return;
    if (!containerRef.current?.contains(selection.anchorNode)) return;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    setPopover({
      x: Math.min(window.innerWidth - 180, Math.max(180, rect.left + rect.width / 2)),
      y: Math.max(96, rect.top - 10),
      text,
    });
    setRewrite(null);
  };

  const handleQuote = () => {
    if (!popover) return;
    insertSnippet(popover.text);
    window.getSelection()?.removeAllRanges();
    setPopover(null);
  };

  const handleRefactor = async () => {
    if (!popover) return;
    setRewrite({ loading: true, text: '' });
    await start(
      API.refactor,
      { text: popover.text, context: '申论材料划词改写' },
      {
        onChunk: (delta) =>
          setRewrite((current) =>
            current ? { ...current, text: current.text + delta } : current,
          ),
        onError: (error) => setRewrite({ loading: false, text: '', error }),
        onDone: () =>
          setRewrite((current) => (current ? { ...current, loading: false } : current)),
      },
    );
  };

  const handleAdoptRewrite = () => {
    if (!rewrite?.text) return;
    insertSnippet(rewrite.text);
    setPopover(null);
    setRewrite(null);
    message.success('已采纳机关语改写');
  };

  const renderEntities = (clause: string) => {
    if (!showEntities) return clause;
    return clause
      .split(/(某市|某区|该市|该县|某镇|某新能源项目|政务服务中心|\d+\s*个部门)/g)
      .filter(Boolean)
      .map((part, index) =>
        ENTITY_PATTERN.test(part) ? (
          <span className="pm-material__entity" key={`${part}-${index}`}>
            {part}
          </span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      );
  };

  const renderParagraph = (text: string) => {
    const clauses = text.match(/[^，。；：！？]+[，。；：！？]?/g) ?? [text];
    return clauses.map((clause, index) => {
      let kind = '';
      if (showProblems && PROBLEM_PATTERN.test(clause)) {
        kind = 'problem';
      } else if (showSolutions && SOLUTION_PATTERN.test(clause)) {
        kind = 'solution';
      }
      return (
        <span
          key={`${clause.slice(0, 8)}-${index}`}
          className={kind ? `pm-material__hl pm-material__hl--${kind}` : ''}
        >
          {renderEntities(clause)}
        </span>
      );
    });
  };

  return (
    <section className="pm-material">
      <header className="pm-material__head">
        <div className="pm-material__title">
          <span className="pm-material__title-main">给定资料</span>
          <span className="pm-material__count">共 {currentQuestion.material.length} 段</span>
        </div>
        <div className="pm-material__tools">
          <button
            className={`pm-tool-chip ${showProblems ? 'is-on' : ''}`}
            onClick={() => setShowProblems((value) => !value)}
          >
            <span className="pm-dot pm-dot--problem" />
            问题表现
            {showProblems && <CheckOutlined className="pm-tool-chip__check" />}
          </button>
          <button
            className={`pm-tool-chip ${showSolutions ? 'is-on' : ''}`}
            onClick={() => setShowSolutions((value) => !value)}
          >
            <span className="pm-dot pm-dot--solution" />
            对策识别
            {showSolutions && <CheckOutlined className="pm-tool-chip__check" />}
          </button>
          <button
            className={`pm-tool-chip ${showEntities ? 'is-on' : ''}`}
            onClick={() => setShowEntities((value) => !value)}
          >
            <HighlightOutlined />
            实体高亮
          </button>
          <Divider type="vertical" className="pm-material__divider" />
          <div className="pm-font-tools">
            <FontSizeOutlined />
            <button
              className="pm-icon-btn"
              onClick={() => setFontSize((value) => Math.max(13, value - 1))}
              aria-label="缩小字号"
            >
              A-
            </button>
            <button
              className="pm-icon-btn"
              onClick={() => setFontSize((value) => Math.min(19, value + 1))}
              aria-label="放大字号"
            >
              A+
            </button>
          </div>
        </div>
      </header>

      <div
        className="pm-material__body"
        ref={containerRef}
        onMouseUp={handleMouseUp}
        style={{ fontSize }}
      >
        {currentQuestion.material.map((paragraph, index) => (
          <article className="pm-material__paragraph" key={`${currentQuestion.id}-${index}`}>
            <span className="pm-material__index">
              {String(index + 1).padStart(2, '0')}
            </span>
            <p>{renderParagraph(paragraph)}</p>
          </article>
        ))}
      </div>

      <footer className="pm-material__foot">
        <span className="pm-material__hint">
          划选任意句子，可直接引用为要点或改写为机关语
        </span>
        <span className="pm-pill">
          <span className="pm-dot pm-dot--problem" /> 问题
          <span className="pm-dot pm-dot--solution" /> 对策
        </span>
      </footer>

      {popover && (
        <div
          className="pm-selection-popover pm-fade-in"
          style={{ left: popover.x, top: popover.y }}
        >
          <div className="pm-selection-popover__actions">
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleQuote}
            >
              提取为要点
            </Button>
            <Button
              size="small"
              icon={isStreaming ? <LoadingOutlined /> : <HighlightOutlined />}
              onClick={handleRefactor}
              loading={isStreaming}
            >
              机关语改写
            </Button>
          </div>
          {rewrite && (
            <div className="pm-selection-popover__rewrite">
              {rewrite.error ? (
                <span className="pm-selection-popover__error">{rewrite.error}</span>
              ) : (
                <span className={rewrite.loading ? 'pm-blink' : ''}>
                  {rewrite.text || '正在推敲规范表述...'}
                </span>
              )}
              {rewrite.text && !rewrite.loading && (
                <Button type="link" size="small" onClick={handleAdoptRewrite}>
                  采纳并插入
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
