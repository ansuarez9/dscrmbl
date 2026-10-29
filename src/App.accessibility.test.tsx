// @vitest-environment jsdom
import { act, cleanup, configure, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from './App';

const catalog = vi.hoisted(() => ({ error: null as string | null }));
// RTL only recognizes Jest fake timers in its default async wrapper.
// user-event advances the Vitest clock; its dispatched events retain RTL act wrapping.
configure({ asyncWrapper: callback => callback() });

vi.mock('./hooks/useDailyTheme', () => ({ useDailyTheme: () => ({
  theme: catalog.error ? null : { themeName: 'TEST', description: 'Five words', wordList: ['apple', 'beach', 'cloud', 'dance', 'earth'] },
  practiceTheme: { themeName: 'BACKUP', description: 'Practice words', wordList: ['apple', 'beach', 'cloud', 'dance', 'earth'] },
  isLoading: false, error: catalog.error, retry: () => {}
}) }));
vi.mock('./hooks/useAudio', () => ({ useAudio: () => ({ muted: true, toggleMute: () => {},
  playCorrectSound: () => {}, playWrongSound: () => {}, playVictorySound: () => {}, playTimerWarningSound: () => {},
  playHighScoreJingle: () => {}, playTickSound: () => {} }) }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 28, 12));
  const entries = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
    removeItem: (key: string) => { entries.delete(key); }
  });
  localStorage.setItem('dscrmbl-seen-instructions', 'true');
  catalog.error = null;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const game = () => JSON.parse(localStorage.getItem('dscrmbl-game-state')!).state;
function start(hard = false) {
  if (hard) fireEvent.click(screen.getByRole('checkbox', { name: 'HARD MODE' }));
  fireEvent.click(screen.getByRole('button', { name: "PLAY TODAY'S CHALLENGE" }));
  act(() => vi.advanceTimersByTime(3000));
}
function guess(value: string) {
  fireEvent.change(screen.getByLabelText('Your guess'), { target: { value } });
  fireEvent.submit(screen.getByRole('form', { name: 'Guess the word' }));
}

it('supports native keyboard submission, persistent invalid feedback and repeated guesses without scrolling or blurring', async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<App />); start();
  act(() => vi.advanceTimersByTime(100));
  const input = screen.getByRole('textbox', { name: 'Your guess' }) as HTMLInputElement;
  expect(document.activeElement).toBe(input);
  await user.keyboard('{Enter}');
  expect(screen.getByText('Enter a guess first.')).toBeTruthy();
  expect(input.getAttribute('aria-invalid')).toBe('true');
  await user.type(input, 'ZZZZQ');
  await user.keyboard('{Enter}');
  expect(input.value).toBe('ZZZZQ');
  expect(game().attempts).toBe(1);
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.getByText('Not a valid word')).toBeTruthy();
  expect(document.activeElement).toBe(input);
  await user.clear(input); await user.type(input, 'BEACH'); await user.keyboard('{Enter}');
  expect(game().attempts).toBe(2);
  expect(input.value).toBe('');
  expect(document.activeElement).toBe(input);
  expect(screen.getByText('Incorrect guess. 2 attempts remaining.').classList.contains('sr-only')).toBe(false);
  expect(window.scrollTo).not.toHaveBeenCalled();
  expect(input.getAttribute('aria-invalid')).toBe('false');
  guess('APPLE');
  expect(game().phase).toBe('revealing');
  expect(screen.getByText('Correct! The word was APPLE.').classList.contains('sr-only')).toBe(true);
  expect(document.getElementById('letter-count')?.textContent).toContain('5 letters');
  expect(document.activeElement?.id).toBe('start-game');
});

it('hides unrevealed letters and keeps announcements unchanged during timer ticks and replay', () => {
  render(<App />); start(true);
  act(() => vi.advanceTimersByTime(900));
  const letters = document.getElementById('typewritter-output')!;
  expect(letters.getAttribute('aria-hidden')).toBe('true');
  const feedback = document.querySelector('.game-feedback')!;
  expect(feedback.textContent).not.toContain('APPLE');
  expect(feedback.classList.contains('sr-only')).toBe(true);
  expect(document.getElementById('letter-count')?.textContent).toContain('5 letters');
  const text = feedback.textContent;
  act(() => vi.advanceTimersByTime(1000));
  fireEvent.click(screen.getByRole('button', { name: /REPLAY/ }));
  expect(feedback.textContent).toBe(text);
  expect(screen.getByRole('timer').getAttribute('aria-live')).toBe('off');
  act(() => vi.advanceTimersByTime(20000));
  expect(feedback.textContent).toContain('Time expired. Word not solved. The word was APPLE.');
  expect(document.getElementById('typewritter-output')!.hasAttribute('aria-hidden')).toBe(false);
});

it('does not steal modal focus or pause Hard Mode when its deadline expires', () => {
  render(<App />); start(true);
  const deadline = game().wordDeadline;
  fireEvent.click(screen.getByRole('button', { name: /HOW TO PLAY/ }));
  const dialog = screen.getByRole('dialog');
  act(() => vi.advanceTimersByTime(21000));
  expect(document.activeElement).toBe(dialog);
  expect(game().phase).toBe('revealing');
  expect(deadline).toBeLessThan(Date.now());
  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(document.activeElement?.id).toBe('start-game');
});

it('finishes a keyboard-only round and restores useful focus from automatic Results without changing saved results', async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<App />); start();
  for (const [index, word] of ['apple', 'beach', 'cloud', 'dance', 'earth'].entries()) {
    act(() => vi.advanceTimersByTime(100));
    await user.keyboard(word + '{Enter}');
    if (index < 4) await user.keyboard('{Enter}');
  }
  act(() => vi.advanceTimersByTime(2000));
  act(() => vi.advanceTimersByTime(1500));
  expect(document.activeElement).toBe(screen.getByRole('dialog'));
  const saved = localStorage.getItem('dscrmbl-daily');
  await user.keyboard('{Escape}');
  expect(document.activeElement?.id).toBe('view-results');
  expect(localStorage.getItem('dscrmbl-daily')).toBe(saved);
});

it('cancels pending input focus when Instructions opens', () => {
  render(<App />); start();
  fireEvent.click(screen.getByRole('button', { name: /HOW TO PLAY/ }));
  const dialog = screen.getByRole('dialog');
  act(() => vi.advanceTimersByTime(100));
  expect(document.activeElement).toBe(dialog);
});

it('keeps focus on the restored modal opener after a reduced-motion close', () => {
  render(<App />); start();
  act(() => vi.advanceTimersByTime(100));
  const opener = screen.getByRole('button', { name: /HOW TO PLAY/ });
  opener.focus();
  fireEvent.click(opener);
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(document.activeElement).toBe(opener);
  act(() => vi.advanceTimersByTime(500));
  expect(document.activeElement).toBe(opener);
});

it('replaces an open dialog with automatic Results without leaving competing focus traps', () => {
  render(<App />); start();
  for (const [index, word] of ['apple', 'beach', 'cloud', 'dance', 'earth'].entries()) {
    guess(word);
    if (index < 4) fireEvent.click(document.getElementById('start-game')!);
  }
  fireEvent.click(screen.getByRole('button', { name: /HOW TO PLAY/ }));
  act(() => vi.advanceTimersByTime(2000));
  act(() => vi.advanceTimersByTime(1500));
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  expect(screen.getByRole('dialog').getAttribute('aria-labelledby')).toBe('modal-title');
  expect(document.activeElement).toBe(screen.getByRole('dialog'));
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement?.id).toBe('view-results');
});

// jsdom cannot measure rendered contrast, viewport reflow or phone keyboards.
// Those are covered by the documented browser/manual checks.
it.each(['idle', 'playing', 'validation', 'instructions', 'contact', 'results', 'recovery'])(
  'has no axe structural accessibility violations in %s', async state => {
    if (state === 'recovery') catalog.error = 'Today is unavailable. Retry or play practice.';
    if (state === 'results') localStorage.setItem('dscrmbl-daily', JSON.stringify({
      score: 50, average: 50, gamesPlayed: 1, highScore: 50, history: [50], lastPlayed: '2026-10-28', currentStreak: 0,
      lastGameResults: { wordResults: ['apple', 'beach', 'cloud', 'dance', 'earth'].map((_, index) => ({
        solved: index !== 4, attempts: index === 0 ? 1 : 2, usedReplay: index === 2
      })), wordScores: [15, 10, 10, 15, 0], streakBonus: 0, isNewHighScore: false,
      words: ['apple', 'beach', 'cloud', 'dance', 'earth'], explanation: { summary: 'An example connection.' } }
    }));
    render(<App />);
    if (state === 'playing' || state === 'validation') { start(); act(() => vi.advanceTimersByTime(800)); }
    if (state === 'validation') guess('ZZZZQ');
    if (state === 'instructions') fireEvent.click(screen.getByRole('button', { name: /HOW TO PLAY/ }));
    if (state === 'contact') fireEvent.click(screen.getByRole('button', { name: 'Contact' }));
    if (state === 'results') fireEvent.click(screen.getByRole('button', { name: 'VIEW RESULTS' }));
    vi.useRealTimers();
    const report = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } });
    expect(report.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
  }
);
