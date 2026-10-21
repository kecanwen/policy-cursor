import {
  CheckCircleFilled,
  CloseCircleFilled,
  WarningFilled,
} from '@ant-design/icons';
import type { RubricRow } from '@/utils/markdown';
import './style.less';

function verdictMeta(verdict: string) {
  if (verdict.includes('命中')) {
    return { className: 'hit', icon: <CheckCircleFilled />, label: '命中' };
  }
  if (verdict.includes('不准')) {
    return { className: 'partial', icon: <WarningFilled />, label: '表达不准' };
  }
  return { className: 'miss', icon: <CloseCircleFilled />, label: '遗漏' };
}

export default function RubricTable({
  rows,
  streaming,
}: {
  rows: RubricRow[];
  streaming?: boolean;
}) {
  if (!rows.length) {
    return (
      <div className="pm-rubric-empty">
        <div className="pm-rubric-empty__art">
          <span />
          <span />
          <span />
        </div>
        <div>
          {streaming ? '正在逐条比对采分点...' : '提交后，这里会逐条显示采分点的命中与溯源。'}
        </div>
      </div>
    );
  }

  return (
    <div className="pm-rubric">
      <div className="pm-rubric__head">
        <span>参考采分点</span>
        <span>你的作答</span>
        <span>判定</span>
      </div>
      {rows.map((row) => {
        const meta = verdictMeta(row.verdict);
        const [label, ...rest] = row.point.split(/[：:]/);
        return (
          <div className={`pm-rubric__row pm-rubric__row--${meta.className}`} key={row.index}>
            <div className="pm-rubric__index">{row.index.padStart(2, '0')}</div>
            <div className="pm-rubric__point">
              <strong>{label}</strong>
              {rest.length > 0 && <span>{rest.join('：')}</span>}
            </div>
            <div className="pm-rubric__matched">
              {row.matched === '未体现' ? (
                <span className="pm-rubric__missing">未体现</span>
              ) : (
                <span>“{row.matched}”</span>
              )}
            </div>
            <div className={`pm-rubric__verdict pm-rubric__verdict--${meta.className}`}>
              {meta.icon}
              {meta.label}
            </div>
            <div className="pm-rubric__analysis">{row.analysis}</div>
          </div>
        );
      })}
    </div>
  );
}
