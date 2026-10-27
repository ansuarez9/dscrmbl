// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from './App';
import type { DailyStats, GameState } from './types/game';
import { generateShareText } from './utils/share';
import { useDailyChallenge } from './hooks/useDailyChallenge';

const audio = vi.hoisted(() => {
  const silent = () => {};
  return { muted: true, toggleMute: silent, playCorrectSound: silent, playWrongSound: silent,
    playVictorySound: silent, playTimerWarningSound: silent, playHighScoreJingle: silent, playTickSound: silent };
});
vi.mock('./hooks/useAudio', () => ({ useAudio: () => audio }));

const fallback = { themeName: 'BACKUP', description: 'Practice words', wordList: ['apple', 'beach', 'cloud', 'dance', 'earth'] };
const daily = { themeName: 'DAILY', description: 'Daily words', wordList: ['flame', 'grape', 'house', 'ivory', 'jelly'] };
const response = (data: unknown) => ({ ok: true, json: async () => data }) as Response;
const stats: DailyStats = {
  score: 87, average: 87, gamesPlayed: 1, highScore: 87, history: [87],
  lastPlayed: new Date(2026, 9, 25).toDateString(), currentStreak: 3
};
let entries: Map<string, string>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 26, 12));
  entries = new Map([
    ['dscrmbl-seen-instructions', 'true'],
    ['dscrmbl-daily', JSON.stringify(stats)],
    ['soundMuted', 'true']
  ]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
    removeItem: (key: string) => { entries.delete(key); }
  });
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function flushFetch() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

function savedGame(): GameState {
  return JSON.parse(entries.get('dscrmbl-game-state')!).state as GameState;
}

function solveRound(words: string[]) {
  words.forEach((word, index) => {
    fireEvent.change(document.getElementById('user-input')!, { target: { value: word } });
    fireEvent.click(document.getElementById('submit-action')!);
    if (index < 4) fireEvent.click(document.getElementById('start-game')!);
  });
}

it('keeps practice isolated across refresh, then allows the daily challenge after retry', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(response({ _fallback: fallback }))
    .mockResolvedValue(response({ '2026-10-26': daily, _fallback: fallback }));
  vi.stubGlobal('fetch', fetchMock);
  const first = render(<App />);
  await flushFetch();
  expect(screen.getByText(/isn't available right now/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /PLAY FALLBACK PRACTICE ROUND/ }));
  expect(savedGame().isDailyChallenge).toBe(false);
  expect(savedGame().roundTheme).toEqual(fallback);
  expect(screen.getByText('PRACTICE ROUND')).toBeTruthy();
  first.unmount();

  render(<App />);
  await flushFetch();
  expect(screen.getByText('PRACTICE ROUND')).toBeTruthy();
  expect(savedGame().isDailyChallenge).toBe(false);
  expect(savedGame().roundTheme).toEqual(fallback);
  solveRound(fallback.wordList);
  act(() => vi.advanceTimersByTime(2000));
  act(() => vi.advanceTimersByTime(1500));
  expect(screen.getByText('PRACTICE WORDS')).toBeTruthy();
  expect(screen.queryByText('HISTORICAL RANKING')).toBeNull();
  expect(entries.get('dscrmbl-daily')).toBe(JSON.stringify(stats));
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  fireEvent.click(document.getElementById('share-btn')!);
  await flushFetch();
  expect(writeText).toHaveBeenCalledOnce();
  expect(writeText.mock.calls[0][0]).toContain('DSCRMBL Practice');
  expect(writeText.mock.calls[0][0]).not.toContain('Daily #');
  expect(generateShareText(null, 25, [], 0, fallback.themeName, false)).not.toContain('Daily #');

  fireEvent.click(document.getElementById('final-score-modal')!);
  await flushFetch();
  expect(screen.getByRole('button', { name: /PLAY TODAY'S CHALLENGE/ })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /PLAY TODAY'S CHALLENGE/ }));
  expect(savedGame().isDailyChallenge).toBe(true);
  expect(savedGame().roundTheme).toEqual(daily);
  expect(entries.get('dscrmbl-daily')).toBe(JSON.stringify(stats));
  solveRound(daily.wordList);
  act(() => vi.advanceTimersByTime(2000));
  expect(JSON.parse(entries.get('dscrmbl-daily')!).lastPlayed).toBe('2026-10-26');
  expect(JSON.parse(entries.get('dscrmbl-daily')!).gamesPlayed).toBe(2);
});

it('offers recovery even when the daily was already completed', async () => {
  entries.set('dscrmbl-daily', JSON.stringify({ ...stats, lastPlayed: new Date().toDateString() }));
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  render(<App />);
  await flushFetch();
  expect(screen.getByText("You've completed today's challenge!")).toBeTruthy();
  expect(screen.getByRole('button', { name: 'RETRY' })).toBeTruthy();
  expect(screen.getByRole('button', { name: /PLAY FALLBACK PRACTICE ROUND/ })).toBeTruthy();
});

it('views a legacy completed result without changing its recorded statistics', async () => {
  const completed = { ...stats, score: 60, average: 75, gamesPlayed: 2, highScore: 90,
    history: [60, 90], lastPlayed: new Date().toDateString(),
    lastGameResults: { wordResults: [], streakBonus: 0, wordScores: [], isNewHighScore: false } };
  entries.set('dscrmbl-daily', JSON.stringify(completed));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ '2026-10-26': daily, _fallback: fallback })));
  const first = render(<App />);
  await flushFetch();
  for (let index = 0; index < 2; index++) {
    fireEvent.click(document.getElementById('view-results')!);
    expect(document.getElementById('gamesPlayed')?.textContent).toBe('2');
    expect(document.getElementById('averageScore')?.textContent).toBe('75');
    act(() => vi.advanceTimersByTime(1000));
    expect(document.getElementById('marker-text')?.textContent).toBe('50%');
    expect(entries.get('dscrmbl-daily')).toBe(JSON.stringify(completed));
    fireEvent.click(document.getElementById('final-score-modal')!);
    act(() => vi.advanceTimersByTime(250));
  }
  first.unmount();
  render(<App />);
  await flushFetch();
  fireEvent.click(document.getElementById('view-results')!);
  expect(document.getElementById('gamesPlayed')?.textContent).toBe('2');
  expect(entries.get('dscrmbl-daily')).toBe(JSON.stringify(completed));
});

it('records the same daily completion only once', () => {
  const { result } = renderHook(() => useDailyChallenge('2026-10-26'));
  const details = { wordResults: [], wordScores: [], streakBonus: 0, isNewHighScore: false };
  const completions: Array<ReturnType<typeof result.current.recordDailyCompletion>> = [];
  act(() => {
    completions.push(result.current.recordDailyCompletion(100, 3, details, daily, '2026-10-26'));
    completions.push(result.current.recordDailyCompletion(100, 3, details, daily, '2026-10-26'));
  });
  expect(completions[0]?.stats.gamesPlayed).toBe(2);
  expect(completions[1]).toBeNull();
  expect(JSON.parse(entries.get('dscrmbl-daily')!).history).toEqual([87, 100]);
});

it('makes the next challenge available at midnight and reloads its theme', async () => {
  vi.setSystemTime(new Date(2026, 9, 26, 23, 59, 59));
  entries.set('dscrmbl-daily', JSON.stringify({ ...stats, lastPlayed: 'Mon Oct 26 2026' }));
  const next = { ...daily, themeName: 'TOMORROW' };
  const fetchMock = vi.fn().mockResolvedValue(response({ '2026-10-26': daily, '2026-10-27': next }));
  vi.stubGlobal('fetch', fetchMock);
  render(<App />);
  await flushFetch();
  expect(screen.getByText("You've completed today's challenge!")).toBeTruthy();
  act(() => vi.advanceTimersByTime(2000));
  await flushFetch();
  expect(screen.getByRole('button', { name: /PLAY TODAY'S CHALLENGE/ })).toBeTruthy();
  expect(screen.getByText('TOMORROW')).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(JSON.parse(entries.get('dscrmbl-daily')!).gamesPlayed).toBe(1);
});

it('keeps yesterday’s results fixed across midnight until closed', async () => {
  vi.setSystemTime(new Date(2026, 9, 26, 23, 59, 59));
  const completed = { ...stats, lastPlayed: 'Mon Oct 26 2026',
    lastGameResults: { wordResults: [], streakBonus: 0, wordScores: [], isNewHighScore: false,
      dailyNumber: 1029, themeName: 'YESTERDAY', words: daily.wordList, percentile: 100 } };
  entries.set('dscrmbl-daily', JSON.stringify(completed));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ '2026-10-26': daily, '2026-10-27': { ...daily, themeName: 'TOMORROW' } })));
  render(<App />);
  await flushFetch();
  fireEvent.click(document.getElementById('view-results')!);
  expect(document.getElementById('modal-title')?.textContent).toBe('DAILY #1029');
  act(() => vi.advanceTimersByTime(2000));
  await flushFetch();
  expect(document.getElementById('modal-title')?.textContent).toBe('DAILY #1029');
  expect(screen.getByText('YESTERDAY')).toBeTruthy();
  expect(screen.getByText('DAILY WORDS')).toBeTruthy();
  expect(entries.get('dscrmbl-daily')).toBe(JSON.stringify(completed));
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  fireEvent.click(document.getElementById('share-btn')!);
  await flushFetch();
  expect(writeText.mock.calls[0][0]).toContain('DSCRMBL Daily #1029\nYESTERDAY');
  fireEvent.click(document.getElementById('final-score-modal')!);
  expect(screen.getByRole('button', { name: /PLAY TODAY'S CHALLENGE/ })).toBeTruthy();
});

it('restores a daily round after midnight and records it under its start date', async () => {
  vi.setSystemTime(new Date(2026, 9, 26, 23, 59, 59));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ '2026-10-26': daily, '2026-10-27': { ...daily, themeName: 'TOMORROW' } })));
  const first = render(<App />);
  await flushFetch();
  fireEvent.click(screen.getByRole('button', { name: /PLAY TODAY'S CHALLENGE/ }));
  expect(savedGame().roundDate).toBe('2026-10-26');
  vi.setSystemTime(new Date(2026, 9, 27, 8));
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(screen.getByText('DAILY')).toBeTruthy();
  first.unmount();
  render(<App />);
  await flushFetch();
  expect(savedGame().roundDate).toBe('2026-10-26');
  expect(screen.getByText('DAILY')).toBeTruthy();
  solveRound(daily.wordList);
  act(() => vi.advanceTimersByTime(2000));
  const recorded = JSON.parse(entries.get('dscrmbl-daily')!);
  expect(recorded.lastPlayed).toBe('2026-10-26');
  expect(recorded.gamesPlayed).toBe(2);
  act(() => vi.advanceTimersByTime(1500));
  fireEvent.click(document.getElementById('final-score-modal')!);
  expect(screen.getByRole('button', { name: /PLAY TODAY'S CHALLENGE/ })).toBeTruthy();
  expect(JSON.parse(entries.get('dscrmbl-daily')!).gamesPlayed).toBe(2);
});

it('recovers when the next day’s theme is missing after a background return', async () => {
  vi.setSystemTime(new Date(2026, 9, 26, 23, 59, 59));
  const previous = { ...stats, lastPlayed: 'Mon Oct 26 2026' };
  entries.set('dscrmbl-daily', JSON.stringify(previous));
  const fetchMock = vi.fn().mockResolvedValueOnce(response({ '2026-10-26': daily, _fallback: fallback }))
    .mockResolvedValueOnce(response({ _fallback: fallback }))
    .mockResolvedValue(response({ '2026-10-27': daily, _fallback: fallback }));
  vi.stubGlobal('fetch', fetchMock);
  render(<App />);
  await flushFetch();
  vi.setSystemTime(new Date(2026, 9, 27, 9));
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  await flushFetch();
  expect(screen.getByText(/isn't available right now/)).toBeTruthy();
  expect(screen.getByRole('button', { name: /PLAY FALLBACK PRACTICE ROUND/ })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /PLAY FALLBACK PRACTICE ROUND/ }));
  expect(savedGame().isDailyChallenge).toBe(false);
  solveRound(fallback.wordList);
  act(() => vi.advanceTimersByTime(2000));
  act(() => vi.advanceTimersByTime(1500));
  expect(entries.get('dscrmbl-daily')).toBe(JSON.stringify(previous));
  fireEvent.click(document.getElementById('final-score-modal')!);
  fireEvent.click(screen.getByRole('button', { name: 'RETRY' }));
  await flushFetch();
  expect(screen.getByRole('button', { name: /PLAY TODAY'S CHALLENGE/ })).toBeTruthy();
  expect(entries.get('dscrmbl-daily')).toBe(JSON.stringify(previous));
});
