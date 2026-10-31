// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, configure, fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from './App';
import { loadTutorialBoot, TUTORIAL_KEY, useTutorial } from './hooks/useTutorial';
import { gameReducer, initialState } from './utils/gameEngine';

const catalog = vi.hoisted(() => ({ error: null as string | null, loading: false }));
const daily = { themeName: 'DAILY', description: 'Daily words', wordList: ['apple', 'beach', 'cloud', 'dance', 'earth'] };
vi.mock('./hooks/useDailyTheme', () => ({ useDailyTheme: () => ({
  theme: catalog.error || catalog.loading ? null : daily, practiceTheme: daily,
  isLoading: catalog.loading, error: catalog.error, retry: () => {}
}) }));
vi.mock('./hooks/useAudio', () => ({ useAudio: () => ({ muted: true, toggleMute: () => {},
  playCorrectSound: () => {}, playWrongSound: () => {}, playVictorySound: () => {}, playTimerWarningSound: () => {},
  playHighScoreJingle: () => {}, playTickSound: () => {} }) }));
configure({ asyncWrapper: callback => callback() });
let entries: Map<string, string>;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 28, 12));
  entries = new Map();
  vi.stubGlobal('localStorage', { getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); }, removeItem: (key: string) => { entries.delete(key); } });
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  catalog.error = null; catalog.loading = false;
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const saved = () => JSON.parse(entries.get(TUTORIAL_KEY)!);
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const help = () => click(/HOW TO PLAY/);
function start() { click('START PRACTICE'); }
function watch() {
  click('WATCH LETTERS');
  act(() => vi.advanceTimersByTime(3000));
  act(() => vi.advanceTimersByTime(1400));
  act(() => vi.advanceTimersByTime(100));
}
function guess(value: string) {
  fireEvent.change(screen.getByLabelText('Your guess'), { target: { value } });
  fireEvent.submit(screen.getByRole('form', { name: 'Guess the word' }));
}
function complete() {
  watch(); guess('CAT'); click('NEXT PRACTICE WORD'); watch(); guess('SUN'); click('FINISH PRACTICE');
}

it('offers new players practice once without starting a scored challenge, including under Strict Mode', () => {
  const first = render(<StrictMode><App /></StrictMode>);
  expect(screen.getByRole('dialog', { name: 'Try a quick practice?' })).toBeTruthy();
  expect(saved().invitationHandled).toBe(true);
  expect(saved().completed).toBe(false);
  expect(entries.get('dscrmbl-game-state')).toBeUndefined();
  expect(entries.get('dscrmbl-daily')).toBeUndefined();
  first.unmount(); render(<App />);
  expect(screen.queryByRole('dialog')).toBeNull();
});

it.each(['SKIP FOR NOW', 'Escape', 'backdrop', 'Skip practice'])('dismisses via %s without repeated invitations', method => {
  const first = render(<App />);
  if (method === 'Escape') fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  else if (method === 'backdrop') fireEvent.click(document.getElementById('tutorial-invitation')!);
  else click(method);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(saved().completed).toBe(false);
  first.unmount(); render(<App />);
  expect(screen.queryByRole('dialog')).toBeNull();
  help(); expect(screen.getByRole('button', { name: 'START TUTORIAL' })).toBeTruthy();
});

it('opens full instructions from the invitation and can launch practice from Help', () => {
  render(<App />); click('READ INSTRUCTIONS');
  expect(screen.getByRole('dialog', { name: '// HOW TO PLAY' })).toBeTruthy();
  click('START TUTORIAL');
  expect(screen.getByRole('heading', { name: 'Watch and guess' })).toBe(document.activeElement);
  expect(screen.queryByRole('dialog')).toBeNull();
});

it.each(['dscrmbl-seen-instructions', 'dscrmbl-daily', 'dscrmbl-game-state'])('does not invite returning players with %s', key => {
  entries.set(key, key === 'dscrmbl-seen-instructions' ? 'true' : key === 'dscrmbl-daily' ? JSON.stringify({ gamesPlayed: 1, history: [], lastPlayed: '2026-10-28', score: 2, highScore: 2, average: 2, currentStreak: 0 }) : '{}');
  render(<App />);
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('walks through CAT and SUN with actual scoring, optional Replay, persistent practice labeling and no sharing', () => {
  render(<App />); start();
  expect(screen.getByText('TUTORIAL PRACTICE · NORMAL MODE')).toBeTruthy();
  expect(document.getElementById('typewritter-output')?.querySelectorAll('span')).toHaveLength(0);
  watch(); guess('CAT');
  expect(saved().run.game.wordScores).toEqual([19]);
  expect(screen.getByText('Green ✓ — a clean first-try solve.')).toBeTruthy();
  expect(document.activeElement?.id).toBe('tutorial-continue');
  click('NEXT PRACTICE WORD');
  expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Try a replay' }));
  expect(saved().run.game.showLetters).toBe(false);
  watch();
  expect(screen.getByText(/Replay shows the letters again/)).toBeTruthy();
  click('REPLAY (5)');
  act(() => vi.advanceTimersByTime(1400));
  act(() => vi.advanceTimersByTime(100));
  expect(saved().run.game.replayCount).toBe(1);
  guess('SUN');
  expect(saved().run.game.wordScores).toEqual([19, 17]);
  expect(screen.getByText(/Yellow ≈ — solved/)).toBeTruthy();
  click('FINISH PRACTICE');
  expect(saved().completed).toBe(true); expect(saved().run).toBeNull();
  expect(screen.getByRole('heading', { name: 'Practice finished' })).toBe(document.activeElement);
  expect(screen.getByText(/Hard Mode adds a 20-second timer/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /SHARE/ })).toBeNull();
  click('BACK TO DAILY CHALLENGE');
  expect(document.activeElement?.id).toBe('start-game');
  expect(entries.get('dscrmbl-game-state')).toBeUndefined();
  help(); click('REPLAY TUTORIAL');
  expect(saved().completed).toBe(true); expect(saved().run.game.wordIndex).toBe(0);
});

it('supports a complete keyboard-only tutorial without forcing replay', async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<App />);
  await user.tab(); // Invitation close.
  await user.tab(); await user.keyboard('{Enter}'); // Start practice.
  expect(screen.getByRole('heading', { name: 'Watch and guess' })).toBe(document.activeElement);
  await user.tab();
  expect(document.activeElement?.id).toBe('start-game');
  await user.keyboard('{Enter}'); // Watch letters.
  act(() => vi.advanceTimersByTime(3000)); act(() => vi.advanceTimersByTime(1400));
  act(() => vi.advanceTimersByTime(100));
  expect(document.activeElement?.id).toBe('user-input');
  await user.keyboard('cat{Enter}');
  expect(document.activeElement?.id).toBe('tutorial-continue');
  await user.keyboard('{Enter}'); // Next practice word.
  expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Try a replay' }));
  await user.tab();
  expect(document.activeElement?.id).toBe('start-game');
  await user.keyboard('{Enter}');
  act(() => vi.advanceTimersByTime(3000)); act(() => vi.advanceTimersByTime(1400));
  act(() => vi.advanceTimersByTime(100));
  await user.keyboard('sun{Enter}'); await user.keyboard('{Enter}');
  expect(screen.getByRole('heading', { name: 'Practice finished' })).toBeTruthy();
});

it('keeps invalid guesses for correction, consumes valid wrong guesses, and permits finishing after failures', () => {
  render(<App />); start(); watch();
  guess('ZZZZQ');
  expect(saved().run.game.attempts).toBe(1);
  expect(screen.getByText('Not a valid word')).toBeTruthy();
  expect((screen.getByLabelText('Your guess') as HTMLInputElement).value).toBe('ZZZZQ');
  guess('DOG'); expect(saved().run.game.attempts).toBe(2);
  expect(screen.getByText('Incorrect guess. 2 attempts remaining.')).toBeTruthy();
  guess('DOG'); guess('DOG');
  expect(screen.getByText(/Red ✗ — no points/)).toBeTruthy();
  click('NEXT PRACTICE WORD'); watch(); guess('DOG'); guess('DOG'); guess('DOG'); click('FINISH PRACTICE');
  expect(saved().completed).toBe(true);
  expect(screen.getByText(/Practice points:/).textContent).toContain('0');
});

it.each(['ready', 'countdown', 'flashing', 'guessing', 'result'])('refreshes %s into the landing screen and resumes without a free flash', phase => {
  const first = render(<App />); start();
  if (phase === 'countdown' || phase === 'flashing') click('WATCH LETTERS');
  if (phase === 'flashing') act(() => vi.advanceTimersByTime(3000));
  if (phase === 'guessing' || phase === 'result') { watch(); guess(phase === 'result' ? 'CAT' : 'DOG'); }
  const before = saved().run.game;
  first.unmount(); render(<App />);
  expect(screen.queryByText('TUTORIAL PRACTICE · NORMAL MODE')).toBeNull();
  help(); click('RESUME TUTORIAL');
  const resumed = saved().run;
  expect(resumed.game.attempts).toBe(before.attempts);
  expect(resumed.game.replayCount).toBe(before.replayCount);
  expect(resumed.game.showLetters).toBe(false);
  if (phase === 'flashing' || phase === 'guessing') {
    expect(resumed.stage).toBe('guessing');
    expect(document.getElementById('typewritter-output')?.querySelectorAll('span')).toHaveLength(0);
  }
  if (phase === 'countdown') expect(resumed.stage).toBe('ready');
  if (phase === 'result') expect(screen.getByText('CAT')).toBeTruthy();
});

it('preserves spent replays across exit/refresh, handles exhaustion, and restarts only tutorial progress', () => {
  const first = render(<App />); start(); watch();
  for (let i = 5; i > 0; i--) click(`REPLAY (${i})`);
  act(() => vi.advanceTimersByTime(1400));
  act(() => vi.advanceTimersByTime(100));
  expect(screen.getByRole('button', { name: 'REPLAY (0)' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getByText(/No replays left/)).toBeTruthy();
  click('EXIT PRACTICE');
  first.unmount(); render(<App />); help(); click('RESUME TUTORIAL');
  expect(saved().run.game.replayCount).toBe(5);
  expect(document.getElementById('typewritter-output')?.querySelectorAll('span')).toHaveLength(0);
  click('EXIT PRACTICE'); help(); click('RESTART TUTORIAL');
  expect(saved().run.game.replayCount).toBe(0);
  expect(saved().completed).toBe(false);
});

it('resumes the second word with first-word points and replay costs intact', () => {
  const first = render(<App />); start(); watch(); guess('CAT'); click('NEXT PRACTICE WORD'); watch();
  click('REPLAY (5)'); act(() => vi.advanceTimersByTime(1400));
  first.unmount(); render(<App />); help(); click('RESUME TUTORIAL');
  expect(saved().run.game.wordScores).toEqual([19]);
  expect(saved().run.game.wordIndex).toBe(1);
  expect(saved().run.game.replayCount).toBe(1);
  expect(document.getElementById('typewritter-output')?.querySelectorAll('span')).toHaveLength(0);
  guess('SUN'); click('FINISH PRACTICE');
  expect(screen.getByText(/Practice points:/).textContent).toContain('36');
});

it('does not restart a tutorial flash or change replay costs when motion preference changes', () => {
  let reduced = false;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; },
    addEventListener: (_name: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_name: string, listener: () => void) => listeners.delete(listener) }));
  render(<App />); start(); click('WATCH LETTERS'); act(() => vi.advanceTimersByTime(3000));
  const trigger = saved().run.game.animationTrigger;
  act(() => { reduced = true; listeners.forEach(listener => listener()); });
  act(() => vi.advanceTimersByTime(1400));
  expect(saved().run.game.animationTrigger).toBe(trigger);
  expect(saved().run.game.replayCount).toBe(0);
  expect(document.getElementById('typewritter-output')?.getAttribute('aria-hidden')).toBe('true');
});

it.each([true, false])('protects unfinished saved rounds with isDailyChallenge=%s and blocks tutorial launch', isDaily => {
  const game = gameReducer({ ...initialState, hardModeEnabled: true, timerModeEnabled: true }, {
    type: 'START_GAME', theme: daily, isDailyChallenge: isDaily, initialStreak: 3, roundDate: isDaily ? '2026-10-28' : null
  });
  const timed = gameReducer(game, { type: 'START_WORD_TIMER', wordIndex: 0, startedAt: Date.now() });
  entries.set('dscrmbl-game-state', JSON.stringify({ state: timed, savedDate: '2026-10-28' }));
  render(<App />);
  const before = entries.get('dscrmbl-game-state');
  help();
  expect(screen.getByText('Finish your current round to start the tutorial.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'START TUTORIAL' }).hasAttribute('disabled')).toBe(true);
  click('START TUTORIAL');
  expect(entries.get('dscrmbl-game-state')).toBe(before);
  expect(saved().run).toBeNull();
});

it.each([false, true])('leaves daily stats and Hard Mode preference unchanged and returns to completed=%s', completed => {
  const stats = { gamesPlayed: 3, score: 30, average: 30, highScore: 50, history: [20, 30, 40],
    lastPlayed: completed ? '2026-10-28' : '2026-10-27', currentStreak: 4 };
  entries.set('dscrmbl-daily', JSON.stringify(stats)); entries.set('dscrmbl-hard-mode-preference', 'true');
  render(<App />); help(); click('START TUTORIAL');
  expect(saved().run.game.timerModeEnabled).toBe(false);
  complete();
  expect(entries.get('dscrmbl-daily')).toBe(JSON.stringify(stats));
  expect(entries.get('dscrmbl-hard-mode-preference')).toBe('true');
  expect(entries.get('dscrmbl-game-state')).toBeUndefined();
  click(completed ? 'BACK TO COMPLETED CHALLENGE' : 'BACK TO DAILY CHALLENGE');
  expect(document.activeElement?.id).toBe(completed ? 'view-results' : 'start-game');
});

it.each(['loading', 'error'])('returns to recovery when the daily is %s', state => {
  catalog.loading = state === 'loading'; catalog.error = state === 'error' ? 'Unavailable' : null;
  render(<App />); start(); complete(); click('BACK TO GAME');
  expect(document.activeElement?.id || document.activeElement?.tagName).toBe(state === 'error' ? 'retry-theme' : 'H1');
  expect(entries.get('dscrmbl-daily')).toBeUndefined();
});

it('re-evaluates daily availability across midnight without recording tutorial play', () => {
  vi.setSystemTime(new Date(2026, 9, 28, 23, 59, 50));
  const stats = { gamesPlayed: 1, score: 19, average: 19, highScore: 19, history: [19], lastPlayed: '2026-10-28', currentStreak: 1 };
  entries.set('dscrmbl-daily', JSON.stringify(stats));
  render(<App />); help(); click('START TUTORIAL'); complete();
  expect(screen.getByRole('button', { name: 'BACK TO COMPLETED CHALLENGE' })).toBeTruthy();
  act(() => vi.advanceTimersByTime(5000));
  click('BACK TO DAILY CHALLENGE');
  expect(document.activeElement?.id).toBe('start-game');
  expect(entries.get('dscrmbl-daily')).toBe(JSON.stringify(stats));
});

it.each([null, { version: 1, completed: true, invitationHandled: true, run: { game: {}, stage: 'guessing' } },
  { version: 2, completed: true, invitationHandled: true, run: {} }])('discards malformed/incompatible tutorial runs safely: %j', value => {
  entries.set(TUTORIAL_KEY, value === null ? '{bad json' : JSON.stringify(value));
  render(<App />); expect(screen.queryByRole('dialog')).toBeNull();
  expect(saved().run).toBeNull();
  if (value) expect(saved().completed).toBe(true);
});

it('supports session-only tutorial play when local storage is blocked', () => {
  vi.stubGlobal('localStorage', { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } });
  const { result } = renderHook(() => useTutorial(loadTutorialBoot()));
  act(() => result.current.send({ type: 'start' }));
  expect(result.current.active).toBe(true);
  act(() => result.current.send({ type: 'watch' }));
  act(() => result.current.send({ type: 'flash' }));
  act(() => result.current.send({ type: 'watched' }));
  act(() => result.current.send({ type: 'guess', guess: 'CAT', submittedAt: Date.now() }));
  expect(result.current.record.run?.game.wordScores).toEqual([19]);
});

it.each(['invitation', 'ready', 'guessing', 'result', 'summary'])('has no structural axe violations in tutorial %s', async state => {
  render(<App />);
  if (state !== 'invitation') start();
  if (state === 'guessing' || state === 'result') watch();
  if (state === 'result') guess('CAT');
  if (state === 'summary') complete();
  vi.useRealTimers();
  const report = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } });
  expect(report.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
});
