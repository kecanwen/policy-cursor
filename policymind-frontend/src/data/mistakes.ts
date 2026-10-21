export interface MistakeCard {
  id: string;
  questionId: string;
  category: string;
  title: string;
  chosen: string;
  correct: string;
  breakpoint: string;
  pattern: string;
  tip: string;
  createdAt: string;
  reviewed: boolean;
}

export const seedMistakes: MistakeCard[] = [
  {
    id: 'm1',
    questionId: 'xc-dy-1',
    category: '定义判断',
    title: '“首违不罚”要件遗漏',
    chosen: 'D',
    correct: 'B',
    breakpoint: '概念外延界定',
    pattern: '主体 + 行为 + 限定词三连比对',
    tip: '定义题不要先看选项故事，先把定义拆成 3 个要件，逐项打勾。',
    createdAt: '2026-10-14',
    reviewed: false,
  },
  {
    id: 'm2',
    questionId: 'xc-lj-2',
    category: '逻辑推理',
    title: '必要条件当成充分条件',
    chosen: 'A',
    correct: 'C',
    breakpoint: '充分必要条件倒置',
    pattern: '“只有 A 才 B” = B → A',
    tip: '看到“只有……才……”先写箭头方向，再逐项对照，别靠语感。',
    createdAt: '2026-10-12',
    reviewed: false,
  },
  {
    id: 'm3',
    questionId: 'xc-zy-3',
    category: '片段阅读',
    title: '转折之后的主旨被忽略',
    chosen: 'D',
    correct: 'B',
    breakpoint: '材料主旨转折',
    pattern: '转折词之后才是作者落点',
    tip: '“但、然而、不过”出现时，把后半句单独抄出来，问它是不是在纠正前半句。',
    createdAt: '2026-10-09',
    reviewed: true,
  },
];
