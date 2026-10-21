import { useMemo } from 'react';

export type WordState = 'safe' | 'warning' | 'over';

export function countEssayCharacters(text: string): number {
  // 申论字数按“可见字符”计，标点计入，空格与换行不计入
  return Array.from(text.replace(/\s/g, '')).length;
}

export function useWordCounter(text: string, limit: number) {
  return useMemo(() => {
    const count = countEssayCharacters(text);
    const remaining = limit - count;
    const state: WordState = count > limit ? 'over' : remaining <= 20 ? 'warning' : 'safe';
    return {
      count,
      remaining,
      state,
      percent: Math.min(100, Math.round((count / limit) * 100)),
    };
  }, [text, limit]);
}
