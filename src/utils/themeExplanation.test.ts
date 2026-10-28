import { describe, expect, it } from 'vitest';
import themes from '../../public/themes.json';
import { getThemeExplanation } from './themeExplanation';

const words = ['anvil', 'hammer', 'smith', 'bellows', 'ironwork'];

describe('optional explanation validation', () => {
  it('accepts summaries alone and notes keyed by word, regardless of order', () => {
    expect(getThemeExplanation({ summary: 'A workshop.' }, words)).toEqual({ summary: 'A workshop.' });
    const explanation = { summary: 'A workshop.', wordNotes: { bellows: 'Feeds air to the fire.' } };
    expect(getThemeExplanation(explanation, [...words].reverse())).toEqual(explanation);
  });

  it.each([undefined, null, [], 'text', {}, { summary: '' }, { summary: '  ' },
    { summary: 2 }, { summary: 'Valid', wordNotes: [] }, { summary: 'Valid', wordNotes: null },
    { summary: 'Valid', wordNotes: { unknown: 'A note.' } },
    { summary: 'Valid', wordNotes: { anvil: ' ' } },
    { summary: 'Valid', wordNotes: { anvil: 3 } }
  ])('ignores absent or invalid content: %j', value => {
    expect(getThemeExplanation(value, words)).toBeUndefined();
  });

  it('needs the five puzzle words', () => {
    expect(getThemeExplanation({ summary: 'Valid' }, undefined)).toBeUndefined();
    expect(getThemeExplanation({ summary: 'Valid' }, words.slice(1))).toBeUndefined();
  });
});

describe('authored catalog', () => {
  it.each(Object.entries(themes))('%s has five words and valid optional explanation content', (_date, theme) => {
    expect(theme.wordList).toHaveLength(5);
    if ('explanation' in theme) {
      expect(getThemeExplanation(theme.explanation, theme.wordList)).toEqual(theme.explanation);
    }
  });

  it('limits the initial rollout to the selected fourteen dates', () => {
    const explainedDates = Object.entries(themes).filter(([, theme]) => 'explanation' in theme).map(([date]) => date);
    expect(explainedDates).toHaveLength(14);
    expect(explainedDates.every(date => date >= '2026-10-28' && date <= '2026-11-10')).toBe(true);
    expect('explanation' in themes._fallback).toBe(false);
  });
});
