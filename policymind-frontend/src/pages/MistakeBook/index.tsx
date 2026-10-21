import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightOutlined,
  BugOutlined,
  CheckCircleOutlined,
  DownOutlined,
  ExperimentOutlined,
  UpOutlined,
  WarningFilled,
} from '@ant-design/icons';
import { Button, Empty, Segmented, Tag } from 'antd';
import { history } from 'umi';
import { seedMistakes, type MistakeCard } from '@/data/mistakes';
import './index.less';

export default function MistakeBookPage() {
  const [localCards, setLocalCards] = useState<MistakeCard[]>([]);
  const [filter, setFilter] = useState('全部');
  const [expanded, setExpanded] = useState<string | null>(seedMistakes[0]?.id ?? null);
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem('policymind:mistakes') || '[]');
      setLocalCards(Array.isArray(stored) ? stored : []);
    } catch {
      setLocalCards([]);
    }
  }, []);

  const allCards = useMemo(() => [...localCards, ...seedMistakes], [localCards]);
  const breakpoints = useMemo(
    () => ['全部', ...Array.from(new Set(allCards.map((card) => card.breakpoint)))],
    [allCards],
  );
  const filtered = allCards.filter(
    (card) => filter === '全部' || card.breakpoint === filter,
  );
  const pending = allCards.filter(
    (card) => !(reviewed[card.id] ?? card.reviewed),
  ).length;

  const toggleReviewed = (id: string, initial: boolean) => {
    setReviewed((current) => ({ ...current, [id]: !(current[id] ?? initial) }));
  };

  return (
    <div className="pm-page pm-mistakes">
      <div className="pm-page-head">
        <div>
          <div className="pm-kicker">MISTAKE NOTEBOOK</div>
          <h1 className="pm-page-title">错题集</h1>
          <p className="pm-page-sub">
            错题不是资产，被解释清楚的错因才是。这里按“思维断点”归档，而不是按题号堆叠。
          </p>
        </div>
        <Button
          type="primary"
          icon={<ExperimentOutlined />}
          onClick={() => history.push('/xingce')}
        >
          去行测复盘
        </Button>
      </div>

      <div className="pm-mistake-stats">
        <div className="pm-mistake-stat pm-card">
          <BugOutlined />
          <div>
            <strong>{pending}</strong>
            <span>待复盘错题</span>
          </div>
        </div>
        <div className="pm-mistake-stat pm-card">
          <CheckCircleOutlined />
          <div>
            <strong>{allCards.length - pending}</strong>
            <span>已消化</span>
          </div>
        </div>
        <div className="pm-mistake-stat pm-card">
          <WarningFilled />
          <div>
            <strong>{breakpoints.length - 1}</strong>
            <span>类思维断点</span>
          </div>
        </div>
      </div>

      <div className="pm-mistakes__filter">
        <Segmented
          value={filter}
          onChange={(value) => setFilter(String(value))}
          options={breakpoints}
        />
        <span className="pm-soft">共 {filtered.length} 张卡片</span>
      </div>

      <div className="pm-mistake-list">
        {filtered.map((card) => {
          const isOpen = expanded === card.id;
          const isReviewed = reviewed[card.id] ?? card.reviewed;
          return (
            <article
              key={card.id}
              className={`pm-mistake-card pm-card ${isOpen ? 'is-open' : ''} ${
                isReviewed ? 'is-reviewed' : ''
              }`}
            >
              <button
                type="button"
                className="pm-mistake-card__head"
                onClick={() => setExpanded(isOpen ? null : card.id)}
              >
                <span className="pm-mistake-card__icon">
                  <WarningFilled />
                </span>
                <span className="pm-mistake-card__main">
                  <span className="pm-mistake-card__meta">
                    <Tag bordered={false} className="pm-tag pm-tag--blue">
                      {card.category}
                    </Tag>
                    <span>{card.breakpoint}</span>
                    <span>{card.createdAt}</span>
                  </span>
                  <strong>{card.title}</strong>
                </span>
                <span className="pm-mistake-card__answers">
                  <span>
                    你选 <b className="is-wrong">{card.chosen}</b>
                  </span>
                  <span>
                    正确 <b className="is-right">{card.correct}</b>
                  </span>
                </span>
                {isOpen ? <UpOutlined /> : <DownOutlined />}
              </button>

              {isOpen && (
                <div className="pm-mistake-card__body pm-fade-in">
                  <div className="pm-mistake-card__pattern">
                    <span>秒杀套路</span>
                    <strong>{card.pattern}</strong>
                  </div>
                  <p>{card.tip}</p>
                  <div className="pm-mistake-card__actions">
                    {isReviewed && (
                      <span className="pm-pill pm-pill--success">
                        <CheckCircleOutlined /> 已消化
                      </span>
                    )}
                    <Button
                      size="small"
                      onClick={() => toggleReviewed(card.id, card.reviewed)}
                    >
                      {isReviewed ? '重新标记待复盘' : '标记已消化'}
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      icon={<ArrowRightOutlined />}
                      onClick={() => history.push('/xingce')}
                    >
                      同类题再练
                    </Button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="pm-mistakes__empty">
            <Empty description="这类断点还没有卡片" />
          </div>
        )}
      </div>
    </div>
  );
}
