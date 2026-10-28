// @vitest-environment jsdom
import { StrictMode, type ReactNode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useGameState } from './useGameState';
import { useTimer } from './useTimer';
import type { GameState } from '../types/game';

const START = new Date('2026-10-26T12:00:00').getTime();
const WORDS = ['apple', 'beach', 'cloud', 'dance', 'earth'];

function wrapper({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>;
}

function useSession() {
  const game = useGameState();
  const timer = useTimer({
    deadline: game.state.phase === 'playing' ? game.state.wordDeadline : null,
    onExpire: game.timerExpired
  });
  return { ...game, timer };
}

function savedState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'playing', currentWord: 'APPLE', playableWords: WORDS.slice(1), wordIndex: 0,
    attempts: 1, attemptResults: ['pending', 'pending', 'pending'], wordResults: [], wordScores: [],
    score: 0, streak: 0, streakBonus: 0, replayCount: 0, replayPenalty: 0, lastTimeBonus: 0,
    wordDeadline: null, timerModeEnabled: true, hardModeEnabled: true, isDailyChallenge: true, roundTheme: null, roundDate: null,
    showLetters: false, animationTrigger: 0, ...overrides
  };
}

function saveFixture(state: GameState | Record<string, unknown>) {
  localStorage.setItem('dscrmbl-game-state', JSON.stringify({ state, savedDate: new Date().toDateString() }));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
  const entries = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
    removeItem: (key: string) => { entries.delete(key); },
    clear: () => { entries.clear(); }
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Hard Mode restoration', () => {
  it('preserves an unfinished daily round and its deadline across midnight', () => {
    const beforeMidnight = new Date(2026, 9, 26, 23, 59, 50).getTime();
    vi.setSystemTime(beforeMidnight);
    const first = renderHook(useSession, { wrapper });
    act(() => {
      first.result.current.toggleHardMode();
      first.result.current.startGame({ themeName: 'OLD', description: '', wordList: WORDS }, true, 0, '2026-10-26');
      first.result.current.startWordTimer(0);
      first.result.current.replayWord();
    });
    first.unmount();
    vi.setSystemTime(beforeMidnight + 15_000);
    const restored = renderHook(useSession, { wrapper });
    expect(restored.result.current.state.roundDate).toBe('2026-10-26');
    expect(restored.result.current.state.roundTheme?.themeName).toBe('OLD');
    expect(restored.result.current.state.wordDeadline).toBe(beforeMidnight + 20_000);
    expect(restored.result.current.timer.timeRemaining).toBe(5);
    expect(restored.result.current.state.replayCount).toBe(1);
    expect(restored.result.current.state.showLetters).toBe(false);
  });

  it('keeps a practice round, its words, deadline, and replay cost on refresh', () => {
    const theme = { themeName: 'PRACTICE', description: 'Fallback', wordList: WORDS };
    const first = renderHook(useSession, { wrapper });
    act(() => {
      first.result.current.toggleHardMode();
      first.result.current.startGame(theme, false, 0);
      first.result.current.startWordTimer(0);
      first.result.current.replayWord();
    });
    const deadline = first.result.current.state.wordDeadline;
    first.unmount();

    vi.setSystemTime(START + 5_500);
    const restored = renderHook(useSession, { wrapper });
    expect(restored.result.current.state.isDailyChallenge).toBe(false);
    expect(restored.result.current.state.roundTheme).toEqual(theme);
    expect(restored.result.current.state.wordDeadline).toBe(deadline);
    expect(restored.result.current.timer.timeRemaining).toBe(15);
    expect(restored.result.current.state.replayCount).toBe(1);
    expect(restored.result.current.state.showLetters).toBe(false);
  });

  it('restores the original deadline and derives time after a refresh', () => {
    const first = renderHook(useSession, { wrapper });
    act(() => {
      first.result.current.toggleHardMode();
      first.result.current.startGame({ themeName: 'TEST', description: '', wordList: WORDS }, true);
      first.result.current.startWordTimer(0);
    });
    // Actions are queued in order; the first timer starts after the countdown.
    const deadline = first.result.current.state.wordDeadline;
    expect(deadline).toBe(START + 20_000);
    first.unmount();

    vi.setSystemTime(START + 5_500);
    const restored = renderHook(useSession, { wrapper });
    expect(restored.result.current.state.wordDeadline).toBe(deadline);
    expect(restored.result.current.timer.timeRemaining).toBe(15);
    expect(restored.result.current.state.wordResults).toHaveLength(0);
    expect(restored.result.current.state.showLetters).toBe(false);
    act(() => restored.result.current.replayWord());
    expect(restored.result.current.state.showLetters).toBe(true);
    expect(restored.result.current.state.replayCount).toBe(1);
  });

  it('times out an elapsed saved word exactly once, including in Strict Mode', () => {
    saveFixture(savedState({ wordDeadline: START + 20_000 }));
    vi.setSystemTime(START + 25_000);
    const restored = renderHook(useSession, { wrapper });
    expect(restored.result.current.state.phase).toBe('revealing');
    expect(restored.result.current.state.wordResults).toEqual([{ attempts: 4, solved: false, usedReplay: false }]);
    act(() => {
      restored.result.current.timerExpired(START + 20_000);
      restored.result.current.submitGuess('apple', Date.now());
    });
    expect(restored.result.current.state.wordResults).toHaveLength(1);
    expect(restored.result.current.state.wordScores).toEqual([0]);
  });

  it('uses elapsed wall-clock time after a background pause', () => {
    saveFixture(savedState({ wordDeadline: START + 20_000 }));
    const restored = renderHook(useSession, { wrapper });
    vi.setSystemTime(START + 12_300);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(restored.result.current.timer.timeRemaining).toBe(8);
    vi.setSystemTime(START + 20_001);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(restored.result.current.state.wordResults).toHaveLength(1);
  });

  it('gives the next word 20 seconds and rejects a guess at the old deadline', () => {
    saveFixture(savedState({ wordDeadline: START + 20_000 }));
    const game = renderHook(useSession, { wrapper });
    act(() => game.result.current.submitGuess('apple', START + 19_000));
    expect(game.result.current.state.phase).toBe('revealing');
    expect(game.result.current.state.wordScores[0]).toBeGreaterThan(0);
    vi.setSystemTime(START + 21_000);
    act(() => game.result.current.nextWord());
    expect(game.result.current.state.wordIndex).toBe(1);
    expect(game.result.current.state.wordDeadline).toBe(START + 41_000);
    expect(game.result.current.timer.timeRemaining).toBe(20);
    act(() => game.result.current.submitGuess('beach', START + 41_000));
    expect(game.result.current.state.wordResults[1]?.solved).toBe(false);
  });

  it('gives older later-word saves one fresh window and restarts first-word countdowns', () => {
    const older = savedState({ wordIndex: 1, currentWord: 'BEACH', playableWords: WORDS.slice(2) });
    const { wordDeadline: _oldDeadline, ...withoutDeadline } = older;
    saveFixture(withoutDeadline);
    const later = renderHook(useSession, { wrapper });
    expect(later.result.current.state.wordDeadline).toBe(START + 20_000);
    later.unmount();

    const first = savedState();
    const { wordDeadline: _firstDeadline, ...olderFirst } = first;
    saveFixture(olderFirst);
    const pending = renderHook(useSession, { wrapper });
    expect(pending.result.current.state.wordDeadline).toBeNull();
    expect(pending.result.current.state.showLetters).toBe(false);
  });

  it('restores Normal Mode progress without a deadline', () => {
    saveFixture(savedState({ hardModeEnabled: false, timerModeEnabled: false, attempts: 2, wordDeadline: null, showLetters: true }));
    const game = renderHook(useSession, { wrapper });
    expect(game.result.current.state.attempts).toBe(2);
    expect(game.result.current.state.wordDeadline).toBeNull();
    expect(game.result.current.timer.isRunning).toBe(false);
    expect(game.result.current.state.showLetters).toBe(false);
    act(() => game.result.current.submitGuess('apple', Date.now()));
    expect(game.result.current.state.wordResults[0]?.solved).toBe(true);
  });
});
