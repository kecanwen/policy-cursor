import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightOutlined,
  CheckOutlined,
  EditOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { App, Button, Tooltip } from 'antd';
import { useExamModel } from '@/models/useExamModel';
import { parseDiffSection } from '@/utils/markdown';
import './style.less';

export default function DiffAuditor() {
  const { message } = App.useApp();
  const { evalResult, draftContent, replaceDraftSnippet } = useExamModel();
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const diffs = useMemo(() => {
    if (evalResult.diffs.length) return evalResult.diffs;
    return parseDiffSection(evalResult.markdown);
  }, [evalResult.diffs, evalResult.markdown]);

  const apply = (before: string, after: string) => {
    const key = `${before}→${after}`;
    if (applied.has(key)) return;
    if (replaceDraftSnippet(before, after)) {
      setApplied((current) => new Set(current).add(key));
      message.success('已原地采纳规范表述');
    } else {
      message.warning('原文已变化，无法精确定位该句');
    }
  };

  if (!diffs.length) {
    return (
      <div className="pm-diff-empty">
        <EditOutlined />
        <span>
          {evalResult.status === 'streaming'
            ? '正在推敲规范公文表述...'
            : '本答卷暂未识别到高优先级的白话表述。'}
        </span>
      </div>
    );
  }

  return (
    <div className="pm-diff">
      <div className="pm-diff__legend">
        <span>
          <i className="pm-diff__swatch pm-diff__swatch--before" /> 你的原句
        </span>
        <span>
          <i className="pm-diff__swatch pm-diff__swatch--after" /> 规范公文语
        </span>
        <span className="pm-diff__legend-tip">点击采纳，直接替换作答区原句</span>
      </div>
      {diffs.map((diff, index) => {
        const key = `${diff.before}→${diff.after}`;
        const exists = draftContent.includes(diff.before);
        const done = applied.has(key);
        return (
          <article className="pm-diff__card" key={`${key}-${index}`}>
            <div className="pm-diff__compare">
              <div className="pm-diff__side pm-diff__side--before">
                <span className="pm-diff__tag">原文</span>
                <p>{diff.before}</p>
              </div>
              <ArrowRightOutlined className="pm-diff__arrow" />
              <div className="pm-diff__side pm-diff__side--after">
                <span className="pm-diff__tag">改写</span>
                <p>{diff.after}</p>
              </div>
            </div>
            <div className="pm-diff__foot">
              <span className="pm-diff__reason">{diff.reason}</span>
              {done ? (
                <span className="pm-pill pm-pill--success">
                  <CheckOutlined /> 已采纳
                </span>
              ) : !exists ? (
                <Tooltip title="该句已不在当前作答中，可能已被修改">
                  <Button size="small" disabled icon={<ReloadOutlined />}>
                    未定位
                  </Button>
                </Tooltip>
              ) : (
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<CheckOutlined />}
                  onClick={() => apply(diff.before, diff.after)}
                >
                  一键采纳
                </Button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
