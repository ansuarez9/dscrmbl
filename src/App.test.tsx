// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import App from './App';
import type { GameState } from './types/game';

vi.mock('./hooks/useDailyTheme', () => ({
  useDailyTheme: () => ({
    theme: { themeName: 'TEST', description: 'Test words', wordList: ['apple', 'beach', 'cloud', 'dance', 'earth'] },
    isLoading: false, error: null
  })
}));

vi.mock('./hooks/useDailyChallenge', () => ({
  useDailyChallenge: () => ({
    dailyNumber: 1, canPlayToday: true, todayScore: null, todayResults: null, dailyStats: null,
    updateDailyStats: vi.fn(), getCurrentStreak: 0, updateStreak: vi.fn()
  })
}));

const START = new Date('2026-10-26T12:00:00').getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
  const entries = new Map<string, string>([
    ['dscrmbl-seen-instructions', 'true'],
    ['soundMuted', 'true']
  ]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
    removeItem: (key: string) => { entries.delete(key); }
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function saveFirstWord(deadline: number | null) {
  const state: GameState = {
    phase: 'playing', currentWord: 'APPLE', playableWords: ['beach', 'cloud', 'dance', 'earth'],
    wordIndex: 0, attempts: 1, attemptResults: ['pending', 'pending', 'pending'], wordResults: [],
    wordScores: [], score: 0, streak: 0, streakBonus: 0, replayCount: 0, replayPenalty: 0,
    lastTimeBonus: 0, wordDeadline: deadline, timerModeEnabled: true, hardModeEnabled: true,
    isDailyChallenge: true, roundTheme: null, showLetters: deadline !== null, animationTrigger: 0
  };
  localStorage.setItem('dscrmbl-game-state', JSON.stringify({ state, savedDate: new Date().toDateString() }));
}

it('starts the first deadline after READY/SET/GO, once under Strict Mode', () => {
  saveFirstWord(null);
  render(<StrictMode><App /></StrictMode>);
  expect(screen.getByText('READY')).toBeTruthy();
  expect(JSON.parse(localStorage.getItem('dscrmbl-game-state')!).state.wordDeadline).toBeNull();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText('SET')).toBeTruthy();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText('GO')).toBeTruthy();
  act(() => vi.advanceTimersByTime(1000));
  expect(JSON.parse(localStorage.getItem('dscrmbl-game-state')!).state.wordDeadline).toBe(START + 23_000);
  expect(screen.getByText('20s')).toBeTruthy();
});

it('resumes an already timed first word without replaying the countdown', () => {
  saveFirstWord(START + 20_000);
  vi.setSystemTime(START + 6_000);
  render(<StrictMode><App /></StrictMode>);
  expect(screen.queryByText('READY')).toBeNull();
  expect(screen.queryByText('SET')).toBeNull();
  expect(screen.queryByText('GO')).toBeNull();
  expect(screen.getByText('14s')).toBeTruthy();
  expect(document.querySelectorAll('#typewritter-output span')).toHaveLength(0);
});
