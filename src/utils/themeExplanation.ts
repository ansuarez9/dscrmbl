import type { ThemeExplanation } from '../types/game';

// Optional editorial content must never make an otherwise usable puzzle fail.
// Validate again when reading saved results, which may predate this feature.
export function getThemeExplanation(value: unknown, words: string[] | undefined): ThemeExplanation | undefined {
  if (!words || words.length !== 5 || !value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const { summary, wordNotes } = value as Partial<ThemeExplanation>;
  if (typeof summary !== 'string' || !summary.trim()) return undefined;
  if (wordNotes !== undefined && (
    !wordNotes || typeof wordNotes !== 'object' || Array.isArray(wordNotes)
    || Object.entries(wordNotes).some(([word, note]) => !words.includes(word) || typeof note !== 'string' || !note.trim())
  )) return undefined;
  return { summary, ...(wordNotes === undefined ? {} : { wordNotes }) };
}
