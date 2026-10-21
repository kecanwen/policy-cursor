import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  ClockCircleOutlined,
  DeleteOutlined,
  FileTextOutlined,
  MoonOutlined,
  RobotOutlined,
  SendOutlined,
  StopOutlined,
  SunOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';
import { Alert, App, Button, Drawer, Popconfirm, Progress, Tabs, Tag, Tooltip } from 'antd';
import { useLocation } from 'umi';
import MaterialViewer from '@/components/MaterialViewer';
import EssayEditor from '@/components/EssayEditor';
import RubricTable from '@/components/RubricTable';
import DiffAuditor from '@/components/DiffAuditor';
import SseMarkdown from '@/components/SseMarkdown';
import { ExamModelProvider, useExamModel } from '@/models/useExamModel';
import { useUserConfig } from '@/models/useUserConfig';
import { getExamById } from '@/data/exams';
import { fetchMeta } from '@/services/api';
import { parseBenchmark, parseComment, parseDiffSection, parseHitRate, parseRubric, parseScore, parseWordCount } from '@/utils/markdown';
import './index.less';

const TOTAL_SECONDS = 25 * 60;

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export default function WorkspacePage() {
  const location = useLocation();
  const id = new URLSearchParams(location.search).get('id') || undefined;
  const exam = getExamById(id);
  return (
    <ExamModelProvider key={exam.id} question={exam}>
      <WorkspaceInner />
    </ExamModelProvider>
  );
}

function WorkspaceInner() {
  const {
    currentQuestion,
    evalResult,
    isStreaming,
    isDirty,
    wordStats,
    triggerEvaluate,
    abortStream,
    clearDraft,
  } = useExamModel();
  const { theme, toggleTheme } = useUserConfig();
  const { message } = App.useApp();
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);
  const [ratio, setRatio] = useState(() => {
    const stored = Number(window.localStorage.getItem('policymind:split'));
    return stored >= 30 && stored <= 70 ? stored : 50;
  });
  const [tab, setTab] = useState('rubric');
  const [reportOpen, setReportOpen] = useState(false);
  const [engine, setEngine] = useState<{ mockEnabled: boolean; model: string } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchMeta().then(setEngine);
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (isStreaming) abortStream();
        else triggerEvaluate();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [abortStream, isStreaming, triggerEvaluate]);

  const startDrag = useCallback((event: ReactMouseEvent) => {
    event.preventDefault();
    const rect = bodyRef.current?.getBoundingClientRect();
    if (!rect) return;
    document.body.classList.add('pm-resizing');
    const move = (moveEvent: MouseEvent) => {
      const next = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setRatio(Math.min(70, Math.max(30, next)));
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.body.classList.remove('pm-resizing');
      setRatio((current) => {
        window.localStorage.setItem('policymind:split', String(current));
        return current;
      });
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }, []);

  const markdown = evalResult.markdown;
  const score = useMemo(() => parseScore(markdown), [markdown]);
  const hitRate = useMemo(() => parseHitRate(markdown), [markdown]);
  const parsedWords = useMemo(() => parseWordCount(markdown), [markdown]);
  const comment = useMemo(() => parseComment(markdown), [markdown]);
  const rubricRows = useMemo(() => parseRubric(markdown), [markdown]);
  const diffs = useMemo(
    () => (evalResult.diffs.length ? evalResult.diffs : parseDiffSection(markdown)),
    [evalResult.diffs, markdown],
  );
  const benchmark = useMemo(() => parseBenchmark(markdown), [markdown]);
  const hitCount = rubricRows.filter((row) => row.verdict.includes('命中')).length;

  const timerDanger = remaining <= 300;
  const showDiagnosis = evalResult.status !== 'idle';
  const effectiveStatus =
    evalResult.status === 'done' && isDirty ? 'stale' : evalResult.status;

  const handleReset = () => {
    clearDraft();
    setRemaining(TOTAL_SECONDS);
    setTab('rubric');
    message.success('草稿与计时已重置');
  };

  return (
    <div className="pm-workspace">
      <header className="pm-ws__header">
        <div className="pm-ws__identity">
          <div className="pm-ws__crumbs">
            <span>真题库</span>
            <i>/</i>
            <span>{currentQuestion.source}</span>
            <i>/</i>
            <strong>第 1 题</strong>
          </div>
          <div className="pm-ws__tags">
            <Tag bordered={false} className="pm-tag pm-tag--blue">
              {currentQuestion.category}
            </Tag>
            <Tag bordered={false} className="pm-tag">
              {currentQuestion.difficulty}
            </Tag>
            <span className="pm-ws__title">{currentQuestion.title}</span>
          </div>
        </div>

        <div className="pm-ws__actions">
          <Tooltip title="本题建议用时 25 分钟">
            <div className={`pm-timer ${timerDanger ? 'is-danger' : ''}`}>
              <ClockCircleOutlined />
              <span>{formatClock(remaining)}</span>
            </div>
          </Tooltip>
          <Tooltip title={theme === 'dark' ? '切换浅色主题' : '切换深色主题'}>
            <button className="pm-ghost-icon" onClick={toggleTheme}>
              {theme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
            </button>
          </Tooltip>
          <Popconfirm
            title="清空当前草稿？"
            description="此操作会重置计时与本次诊断。"
            okText="清空"
            cancelText="保留"
            onConfirm={handleReset}
          >
            <Button size="small" type="text" icon={<DeleteOutlined />}>
              清空草稿
            </Button>
          </Popconfirm>
          {isStreaming ? (
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={abortStream}
            >
              停止生成
            </Button>
          ) : (
            <Button
              size="small"
              type="primary"
              icon={<ThunderboltFilled />}
              onClick={triggerEvaluate}
            >
              提交 AI 精批
            </Button>
          )}
        </div>
      </header>

      <div className="pm-ws__body" ref={bodyRef}>
        <div className="pm-ws__left" style={{ width: `${ratio}%` }}>
          <MaterialViewer />
        </div>
        <div
          className="pm-ws__splitter"
          onMouseDown={startDrag}
          role="separator"
          aria-orientation="vertical"
        >
          <span />
        </div>
        <div className="pm-ws__right" style={{ width: `calc(${100 - ratio}% - 12px)` }}>
          <EssayEditor />

          <section className="pm-ai">
            <header className="pm-ai__head">
              <div className="pm-ai__title">
                <span className="pm-ai__icon">
                  <RobotOutlined />
                </span>
                <span>AI 诊断</span>
                <span className="pm-ai__engine">
                  {engine?.mockEnabled === false ? '在线模型' : '演示引擎'}
                  <i />
                </span>
                {effectiveStatus === 'stale' && (
                  <span className="pm-pill" style={{ color: 'var(--pm-warning)' }}>
                    作答已修改
                  </span>
                )}
              </div>
              <div className="pm-ai__head-right">
                {markdown && (
                  <Button
                    type="text"
                    size="small"
                    icon={<FileTextOutlined />}
                    onClick={() => setReportOpen(true)}
                  >
                    原始报告
                  </Button>
                )}
                {effectiveStatus === 'stale' && (
                  <Button size="small" onClick={triggerEvaluate} icon={<ThunderboltFilled />}>
                    重新精批
                  </Button>
                )}
              </div>
            </header>

            <div className="pm-ai__body">
              {!showDiagnosis && (
                <div className="pm-ai__empty">
                  <div className="pm-ai__orb">
                    <RobotOutlined />
                  </div>
                  <h3>让 AI 当一次阅卷组长</h3>
                  <p>
                    逐条比对采分点、溯源到材料段落，并把口语化表述改写成机关公文语。
                  </p>
                  <Button type="primary" icon={<ThunderboltFilled />} onClick={triggerEvaluate}>
                    开始精批
                  </Button>
                  <span className="pm-ai__kbd">
                    或按 <kbd>⌘</kbd> + <kbd>↵</kbd>
                  </span>
                </div>
              )}

              {evalResult.status === 'error' && (
                <div className="pm-ai__error">
                  <Alert
                    type="error"
                    showIcon
                    message="精批失败"
                    description={evalResult.error}
                    action={
                      <Button size="small" onClick={triggerEvaluate}>
                        重试
                      </Button>
                    }
                  />
                </div>
              )}

              {showDiagnosis && evalResult.status !== 'error' && (
                <>
                  {evalResult.status === 'streaming' && (
                    <div className="pm-ai__status">
                      <span className="pm-ai__pulse" />
                      <span>{evalResult.message || '正在生成诊断报告...'}</span>
                      <span className="pm-ai__tokens">
                        {markdown.length} chars
                      </span>
                    </div>
                  )}

                  <div className="pm-score">
                    <div className="pm-score__ring">
                      {score === null ? (
                        <div className="pm-score__ring-skeleton" />
                      ) : (
                        <Progress
                          type="circle"
                          size={64}
                          percent={score * 10}
                          strokeWidth={8}
                          strokeColor={
                            score >= 8
                              ? 'var(--pm-success)'
                              : score >= 6
                                ? 'var(--pm-warning)'
                                : 'var(--pm-danger)'
                          }
                          trailColor="var(--pm-border)"
                          format={() => (
                            <span className="pm-score__number">
                              {score}
                              <small>/10</small>
                            </span>
                          )}
                        />
                      )}
                    </div>
                    <div className="pm-score__stats">
                      <div>
                        <span>命中率</span>
                        <strong>{hitRate === null ? '—' : `${hitRate}%`}</strong>
                      </div>
                      <div>
                        <span>采分点</span>
                        <strong>
                          {rubricRows.length ? `${hitCount}/${rubricRows.length}` : '—'}
                        </strong>
                      </div>
                      <div>
                        <span>字数</span>
                        <strong>{parsedWords ?? wordStats.count}</strong>
                      </div>
                    </div>
                    <p className="pm-score__comment">
                      {comment ||
                        (evalResult.status === 'streaming'
                          ? '阅卷组长正在阅读你的答卷...'
                          : '诊断完成')}
                    </p>
                  </div>

                  <Tabs
                    activeKey={tab}
                    onChange={setTab}
                    className="pm-ai__tabs"
                    size="small"
                    items={[
                      {
                        key: 'rubric',
                        label: (
                          <span>
                            采分点穿透
                            {rubricRows.length > 0 && (
                              <i className="pm-tab-count">{rubricRows.length}</i>
                            )}
                          </span>
                        ),
                        children: (
                          <RubricTable
                            rows={rubricRows}
                            streaming={evalResult.status === 'streaming'}
                          />
                        ),
                      },
                      {
                        key: 'diff',
                        label: (
                          <span>
                            规范语 Diff
                            {diffs.length > 0 && (
                              <i className="pm-tab-count">{diffs.length}</i>
                            )}
                          </span>
                        ),
                        children: <DiffAuditor />,
                      },
                      {
                        key: 'benchmark',
                        label: '满分范文',
                        children: (
                          <BenchmarkPanel
                            text={benchmark}
                            streaming={evalResult.status === 'streaming'}
                          />
                        ),
                      },
                    ]}
                  />
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      <Drawer
        title={
          <span>
            <FileTextOutlined /> AI 原始诊断报告
          </span>
        }
        width={560}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        className="pm-report-drawer"
      >
        <SseMarkdown content={markdown} streaming={evalResult.status === 'streaming'} />
      </Drawer>
    </div>
  );
}

function BenchmarkPanel({ text, streaming }: { text: string; streaming: boolean }) {
  const { message } = App.useApp();
  return (
    <div className="pm-benchmark">
      {text ? (
        <>
          <div className="pm-benchmark__meta">
            <span className="pm-pill pm-pill--success">采分点全覆盖</span>
            <span>严格按照本题字数限制生成</span>
          </div>
          <div className="pm-benchmark__paper pm-essay">
            {text}
            {streaming && <span className="pm-benchmark__caret" />}
          </div>
          <Button
            size="small"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                message.success('范文已复制');
              } catch {
                message.error('复制失败，请手动选择文本');
              }
            }}
          >
            复制范文
          </Button>
        </>
      ) : (
        <div className="pm-benchmark__empty">
          {streaming ? '正在起草标杆范文...' : '诊断完成后，这里会给出满分范文。'}
        </div>
      )}
    </div>
  );
}
