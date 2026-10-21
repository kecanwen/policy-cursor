import { useEffect, useRef, useState } from 'react';
import {
  AimOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseCircleFilled,
  ReloadOutlined,
  StarFilled,
  ThunderboltFilled,
  WarningFilled,
} from '@ant-design/icons';
import { Alert, App, Button, Input, Segmented, Tag } from 'antd';
import { useSSEStream } from '@/hooks/useSSEStream';
import { API, type BreakpointPayload, type MemoryCardPayload } from '@/services/api';
import { xingceQuestions } from '@/data/xingce';
import type { MistakeCard } from '@/data/mistakes';
import SseMarkdown from '@/components/SseMarkdown';
import './index.less';

type DebugStatus = 'idle' | 'streaming' | 'done' | 'error';

export default function XingceDebugPage() {
  const { message } = App.useApp();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [reasoning, setReasoning] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<DebugStatus>('idle');
  const [statusText, setStatusText] = useState('');
  const [report, setReport] = useState('');
  const [error, setError] = useState('');
  const [breakpoint, setBreakpoint] = useState<BreakpointPayload | null>(null);
  const [card, setCard] = useState<MemoryCardPayload | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [saved, setSaved] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const { start, isStreaming } = useSSEStream();

  const question = xingceQuestions[questionIndex];

  useEffect(() => {
    setSelected(null);
    setSubmitted(false);
    setReasoning('');
    setElapsed(0);
    setStatus('idle');
    setReport('');
    setError('');
    setBreakpoint(null);
    setCard(null);
    setFlipped(false);
    setSaved(false);
  }, [questionIndex]);

  useEffect(() => {
    if (submitted) return undefined;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [submitted, questionIndex]);

  const handleDebug = async () => {
    if (!selected) {
      message.warning('先选择一个答案，再复盘你的排除路径');
      return;
    }
    if (!reasoning.trim()) {
      message.warning('写下你排除选项时依据的那句话，AI 才能定位断点');
      return;
    }
    setSubmitted(true);
    setStatus('streaming');
    setReport('');
    setError('');
    setBreakpoint(null);
    setCard(null);
    setSaved(false);
    window.setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);

    await start(
      API.xingceDebug,
      {
        questionId: question.id,
        question: question.question,
        options: question.options,
        userAnswer: selected,
        correctAnswer: question.correct,
        reasoning,
        elapsedSeconds: elapsed,
      },
      {
        onStatus: setStatusText,
        onChunk: (delta) => setReport((current) => current + delta),
        onBreakpoint: setBreakpoint,
        onCard: setCard,
        onError: (errorText) => {
          setError(errorText);
          setStatus('error');
        },
        onDone: () => setStatus('done'),
      },
    );
  };

  const saveMistake = () => {
    if (saved || !breakpoint) return;
    const entry: MistakeCard = {
      id: `local-${Date.now()}`,
      questionId: question.id,
      category: question.category,
      title: question.question.slice(0, 28),
      chosen: selected || '-',
      correct: question.correct,
      breakpoint: breakpoint.stage,
      pattern: card?.pattern || '定位断点后再回看限定词',
      tip: card?.tip || breakpoint.detail,
      createdAt: new Date().toISOString().slice(0, 10),
      reviewed: false,
    };
    const stored = JSON.parse(window.localStorage.getItem('policymind:mistakes') || '[]');
    window.localStorage.setItem('policymind:mistakes', JSON.stringify([entry, ...stored]));
    setSaved(true);
    message.success('已收藏到错因库');
  };

  const resetQuestion = () => {
    setSelected(null);
    setSubmitted(false);
    setReasoning('');
    setElapsed(0);
    setStatus('idle');
    setReport('');
    setError('');
    setBreakpoint(null);
    setCard(null);
    setFlipped(false);
    setSaved(false);
  };

  return (
    <div className="pm-page pm-xingce">
      <div className="pm-page-head">
        <div>
          <div className="pm-kicker">XINGCE · THINKING DEBUGGER</div>
          <h1 className="pm-page-title">行测思维 Debugger</h1>
          <p className="pm-page-sub">
            不做解析倾倒。先回放你的排除路径，定位思维断点，再把这道题压缩成一张可迁移的秒杀卡。
          </p>
        </div>
        <div className="pm-xingce__stats">
          <div className="pm-stat">
            <ClockCircleOutlined />
            <div>
              <span>本题用时</span>
              <strong>{String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</strong>
            </div>
          </div>
          <div className="pm-stat">
            <AimOutlined />
            <div>
              <span>错因库</span>
              <strong>3 类断点</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="pm-xingce__switch">
        <span className="pm-soft">选择要复盘的题</span>
        <Segmented
          value={String(questionIndex)}
          onChange={(value) => setQuestionIndex(Number(value))}
          options={xingceQuestions.map((item, index) => ({
            label: item.category,
            value: String(index),
          }))}
        />
      </div>

      <div className="pm-xingce__grid">
        <section className="pm-question pm-card">
          <div className="pm-question__meta">
            <Tag bordered={false} className="pm-tag pm-tag--blue">
              {question.category}
            </Tag>
            <span>{question.source}</span>
            <span className="pm-question__dot" />
            <span>{question.difficulty}</span>
          </div>
          <h2>{question.question}</h2>

          <div className="pm-options">
            {question.options.map((option, index) => {
              const letter = String.fromCharCode(65 + index);
              const isCorrect = question.correct === letter;
              const isChosen = selected === letter;
              return (
                <button
                  key={letter}
                  type="button"
                  className={[
                    'pm-option',
                    isChosen ? 'is-selected' : '',
                    submitted && isCorrect ? 'is-correct' : '',
                    submitted && isChosen && !isCorrect ? 'is-wrong' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    if (!submitted) {
                      setSelected(letter);
                      setStatus('idle');
                    }
                  }}
                >
                  <span className="pm-option__letter">{letter}</span>
                  <span className="pm-option__text">{option}</span>
                  {submitted && isCorrect && <CheckCircleFilled className="pm-option__mark" />}
                  {submitted && isChosen && !isCorrect && (
                    <CloseCircleFilled className="pm-option__mark" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pm-question__foot">
            <span className="pm-question__hint">
              {selected ? (
                <>
                  已选 <strong>{selected}</strong>
                  {submitted && selected !== question.correct && (
                    <span className="pm-question__wrong"> · 正确答案 {question.correct}</span>
                  )}
                </>
              ) : (
                '先做出你的选择'
              )}
            </span>
            <div className="pm-question__actions">
              {submitted && (
                <Button size="small" icon={<ReloadOutlined />} onClick={resetQuestion}>
                  重做
                </Button>
              )}
              <Button
                size="small"
                type="primary"
                icon={<ThunderboltFilled />}
                loading={isStreaming}
                disabled={submitted}
                onClick={handleDebug}
              >
                复盘我的思路
              </Button>
            </div>
          </div>
        </section>

        <section className="pm-debugger pm-card" ref={panelRef}>
          <header className="pm-debugger__head">
            <div>
              <span className="pm-debugger__eyebrow">AI · 思维回放</span>
              <h3>Debugger 面板</h3>
            </div>
            <span className={`pm-status ${status === 'streaming' ? 'is-live' : ''}`}>
              <i />
              {status === 'idle'
                ? '待复盘'
                : status === 'streaming'
                  ? '正在推演'
                  : status === 'error'
                    ? '中断'
                    : '已完成'}
            </span>
          </header>

          <div className="pm-steps">
            {['定位切入点', '选项纠偏', '秒杀技'].map((label, index) => {
              const active =
                status === 'idle'
                  ? index === 0
                  : status === 'streaming'
                    ? index <= 1
                    : true;
              return (
                <div className={`pm-step ${active ? 'is-active' : ''}`} key={label}>
                  <span>{index + 1}</span>
                  {label}
                </div>
              );
            })}
          </div>

          <div className="pm-debugger__body">
            {status === 'idle' && (
              <>
                <div className="pm-coach">
                  <div className="pm-coach__avatar">AI</div>
                  <div className="pm-coach__bubble">
                    <p>
                      这道题你用了 <strong>{elapsed} 秒</strong>
                      {selected ? (
                        <>
                          ，选了 <strong>{selected}</strong>
                        </>
                      ) : (
                        '，还没做出选择'
                      )}
                      。你当时是依靠哪一句话排除掉其他选项的？
                    </p>
                    <span>不用写得很完整，写你真实的判断依据即可。</span>
                  </div>
                </div>
                <Input.TextArea
                  value={reasoning}
                  onChange={(event) => setReasoning(event.target.value)}
                  placeholder="例如：我看到“只有……才……”就认为完善机制一定能提升效能，所以排除了其他选项……"
                  autoSize={{ minRows: 3, maxRows: 6 }}
                  className="pm-reasoning"
                />
                <div className="pm-debugger__cta">
                  <span className="pm-soft">AI 会指出断点类型，不会直接替你做题。</span>
                  <Button
                    type="primary"
                    icon={<ThunderboltFilled />}
                    onClick={handleDebug}
                    loading={isStreaming}
                  >
                    开始思维复盘
                  </Button>
                </div>
              </>
            )}

            {status === 'streaming' && (
              <div className="pm-debugger__streaming">
                <div className="pm-stream-status">
                  <span className="pm-ai__pulse" />
                  {statusText || '正在回放你的排除路径...'}
                </div>
                <SseMarkdown content={report} streaming />
              </div>
            )}

            {status === 'error' && (
              <Alert
                type="error"
                showIcon
                message="复盘中断"
                description={error}
                action={
                  <Button size="small" onClick={handleDebug}>
                    重试
                  </Button>
                }
              />
            )}

            {status === 'done' && (
              <div className="pm-debugger__result pm-fade-in">
                {breakpoint && (
                  <div className="pm-breakpoint">
                    <div className="pm-breakpoint__flow">
                      <span className="pm-node">题干定位</span>
                      <i>→</i>
                      <span className="pm-node pm-node--break">
                        <WarningFilled /> {breakpoint.stage}
                      </span>
                      <i>→</i>
                      <span className="pm-node">排除选项</span>
                    </div>
                    <p>{breakpoint.detail}</p>
                  </div>
                )}
                <SseMarkdown content={report} />
                {card && (
                  <div className="pm-flashcard-wrap">
                    <div className="pm-flashcard-wrap__head">
                      <span>
                        <StarFilled /> 秒杀技记忆卡
                      </span>
                      <Button
                        size="small"
                        icon={<StarFilled />}
                        onClick={saveMistake}
                        disabled={saved}
                      >
                        {saved ? '已收藏' : '收藏到错因库'}
                      </Button>
                    </div>
                    <div
                      className={`pm-flashcard ${flipped ? 'is-flipped' : ''}`}
                      onClick={() => setFlipped((value) => !value)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="pm-flashcard__inner">
                        <div className="pm-flashcard__face pm-flashcard__front">
                          <span className="pm-flashcard__tag">{card.title}</span>
                          <strong>{card.pattern}</strong>
                          <span className="pm-flashcard__flip">点击翻面看迁移提示 →</span>
                        </div>
                        <div className="pm-flashcard__face pm-flashcard__back">
                          <span className="pm-flashcard__tag">下次遇到同类题</span>
                          <p>{card.tip}</p>
                          <span className="pm-flashcard__flip">← 点击翻回</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
