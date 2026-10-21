import { useMemo, useState } from 'react';
import {
  ArrowRightOutlined,
  BookOutlined,
  FireOutlined,
  LockOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Input, Segmented, Tag } from 'antd';
import { history } from 'umi';
import { examCategories, exams } from '@/data/exams';
import './index.less';

export default function ExamBankPage() {
  const [category, setCategory] = useState('全部');
  const [keyword, setKeyword] = useState('');

  const filtered = useMemo(
    () =>
      exams.filter((exam) => {
        const matchesCategory = category === '全部' || exam.category === category;
        const matchesKeyword =
          !keyword.trim() ||
          exam.title.includes(keyword.trim()) ||
          exam.source.includes(keyword.trim()) ||
          exam.tags.some((tag) => tag.includes(keyword.trim()));
        return matchesCategory && matchesKeyword;
      }),
    [category, keyword],
  );

  const playable = exams.filter((exam) => !exam.locked).length;

  return (
    <div className="pm-page pm-bank">
      <div className="pm-page-head">
        <div>
          <div className="pm-kicker">QUESTION BANK</div>
          <h1 className="pm-page-title">真题库</h1>
          <p className="pm-page-sub">
            按题型拆解的申论题库。每道题都带采分点细则，进入工作台即可边读材料边作答。
          </p>
        </div>
        <div className="pm-bank__stats">
          <div>
            <strong>{playable}</strong>
            <span>套可作答</span>
          </div>
          <i />
          <div>
            <strong>{exams.length}</strong>
            <span>套已收录</span>
          </div>
          <i />
          <div>
            <strong>5</strong>
            <span>类题型</span>
          </div>
        </div>
      </div>

      <div className="pm-bank__toolbar">
        <Segmented
          value={category}
          onChange={(value) => setCategory(String(value))}
          options={examCategories}
        />
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="搜索真题、出处或关键词"
          prefix={<SearchOutlined style={{ color: 'var(--pm-faint)' }} />}
          allowClear
          className="pm-bank__search"
        />
      </div>

      <div className="pm-bank__grid">
        {filtered.map((exam) => (
          <article
            key={exam.id}
            className={`pm-exam-card pm-card ${exam.locked ? 'is-locked' : ''}`}
          >
            <div className="pm-exam-card__top">
              <span className="pm-exam-card__source">
                <BookOutlined /> {exam.source}
              </span>
              <Tag bordered={false} className="pm-tag pm-tag--blue">
                {exam.category}
              </Tag>
            </div>
            <h3>{exam.title}</h3>
            <div className="pm-exam-card__tags">
              {exam.tags.map((tag) => (
                <Tag bordered={false} className="pm-tag" key={tag}>
                  {tag}
                </Tag>
              ))}
            </div>
            <div className="pm-exam-card__meta">
              <span>{exam.difficulty}</span>
              <span>{exam.wordLimit} 字</span>
              <span>
                <FireOutlined /> {exam.practiceCount.toLocaleString()} 人练过
              </span>
            </div>
            <div className="pm-exam-card__foot">
              {exam.locked ? (
                <>
                  <span className="pm-exam-card__locked">
                    <LockOutlined /> 内容整理中
                  </span>
                  <Button size="small" disabled>
                    即将上线
                  </Button>
                </>
              ) : (
                <>
                  <span className="pm-exam-card__year">{exam.year}</span>
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<ArrowRightOutlined />}
                    onClick={() => history.push(`/workspace?id=${exam.id}`)}
                  >
                    进入作答
                  </Button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="pm-bank__empty">
          <SearchOutlined />
          <span>没有找到匹配的真题，换个关键词试试。</span>
        </div>
      )}
    </div>
  );
}
