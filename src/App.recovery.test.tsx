// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from './App';
import type { DailyStats, GameState } from './types/game';
import { generateShareText } from './utils/share';

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
  expect(JSON.parse(entries.get('dscrmbl-daily')!).lastPlayed).toBe(new Date().toDateString());
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
