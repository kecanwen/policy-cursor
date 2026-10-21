import type { DiffSuggestion } from '@/services/api';

export interface RubricRow {
  index: string;
  point: string;
  matched: string;
  verdict: string;
  analysis: string;
}

export function stripMarkdown(text: string) {
  return text
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/^#+\s*/gm, '')
    .trim();
}

export function parseScore(markdown: string): number | null {
  const match = markdown.match(/预估得分\*{0,2}\s*[：:]\s*`?\s*([\d.]+)\s*\/\s*10/);
  return match ? Number(match[1]) : null;
}

export function parseWordCount(markdown: string): number | null {
  const match = markdown.match(/实际\s*(\d+)\s*字/);
  return match ? Number(match[1]) : null;
}

export function parseHitRate(markdown: string): number | null {
  const match = markdown.match(/采分点命中率\*{0,2}\s*[：:]\s*([\d.]+)\s*%/);
  return match ? Number(match[1]) : null;
}

export function parseComment(markdown: string): string {
  const match = markdown.match(/阅卷评语\*{0,2}\s*[：:]\s*(.+)/);
  return match ? stripMarkdown(match[1]) : '';
}

export function parseRubric(markdown: string): RubricRow[] {
  const rows: RubricRow[] = [];
  for (const line of markdown.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = trimmed
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 5) continue;
    if (/^:?-{3,}/.test(cells[0]) || cells[0] === '序号') continue;
    if (/^:?-{3,}/.test(cells[1])) continue;
    rows.push({
      index: cells[0],
      point: cells[1],
      matched: cells[2],
      verdict: cells[3],
      analysis: cells[4],
    });
  }
  return rows;
}

export function parseBenchmark(markdown: string): string {
  const start = markdown.search(/###\s*4\./);
  if (start < 0) return '';
  let section = markdown.slice(start).replace(/###\s*4\.[^\n]*\n?/, '');
  const fence = section.indexOf('```');
  if (fence >= 0) {
    section = section.slice(fence).replace(/^```[a-zA-Z]*\s*\n?/, '');
    const end = section.indexOf('```');
    if (end >= 0) section = section.slice(0, end);
  }
  return section.trim();
}

export function parseDiffSection(markdown: string): DiffSuggestion[] {
  const diffs: DiffSuggestion[] = [];
  let before = '';
  let after = '';
  const flush = (reason?: string) => {
    if (!before || !after) return;
    diffs.push({
      before,
      after,
      reason: reason || '提升公文语感与规范度',
    });
    before = '';
    after = '';
  };
  for (const line of markdown.split('\n')) {
    const beforeMatch = line.match(/❌\s*\*{0,2}考生原句\*{0,2}\s*[：:]\s*(.+)/);
    if (beforeMatch) {
      if (before && after) flush();
      before = stripMarkdown(beforeMatch[1]);
      continue;
    }
    const afterMatch = line.match(/✅\s*\*{0,2}规范公文语\*{0,2}\s*[：:]\s*(.+)/);
    if (afterMatch && before) {
      after = stripMarkdown(afterMatch[1]);
      continue;
    }
    const reasonMatch = line.match(/💡\s*\*{0,2}改写精要\*{0,2}\s*[：:]\s*(.+)/);
    if (reasonMatch && before && after) {
      flush(stripMarkdown(reasonMatch[1]));
    }
  }
  flush();
  return diffs;
}

export function getSection(markdown: string, index: number): string {
  const start = markdown.search(new RegExp(`###\\s*${index}\\.`));
  if (start < 0) return '';
  const rest = markdown.slice(start);
  const next = rest.slice(4).search(/###\s*\d\./);
  return next < 0 ? rest : rest.slice(0, next + 4);
}
