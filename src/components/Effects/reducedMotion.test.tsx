// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FinalScoreModal } from '../Modals/FinalScoreModal';
import { WordOutput } from '../Game/WordOutput';
import { HighScoreCelebration } from './HighScoreCelebration';

const audio = vi.hoisted(() => ({ playTickSound: vi.fn() }));
vi.mock('../../context/AudioContext', () => ({ useAudioContext: () => audio }));
let reduced = false;
let listeners: Set<() => void>;
function preference(value: boolean) {
  act(() => { reduced = value; listeners.forEach(notify => notify()); });
}
beforeEach(() => {
  vi.useFakeTimers();
  listeners = new Set(); reduced = false;
  vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; },
    addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener)
  }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); audio.playTickSound.mockClear(); });

it('shows a stable accessible score, stops roll-up on preference change, and cancels tick timers', () => {
  const view = render(<FinalScoreModal isOpen onClose={() => {}} dailyNumber={1} isDailyChallenge score={80}
    stats={null} percentile={{ history: [], percentile: 100 }} wordResults={[]} streakBonus={0}
    isNewHighScore animateCelebration />);
  expect(screen.getByText('Final score: 80')).toBeTruthy();
  expect(document.getElementById('score')?.getAttribute('aria-hidden')).toBe('true');
  act(() => vi.advanceTimersByTime(150));
  expect(audio.playTickSound).toHaveBeenCalled();
  preference(true);
  expect(document.getElementById('score')?.textContent).toBe('80');
  const ticks = audio.playTickSound.mock.calls.length;
  act(() => vi.advanceTimersByTime(2000));
  expect(audio.playTickSound).toHaveBeenCalledTimes(ticks);
  view.unmount();
  expect(listeners.size).toBe(0);
});

it.each([false, true])('preserves letter scheduling and replay behavior with reduced motion=%s', motion => {
  preference(motion);
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  const completed = vi.fn();
  const props = { word: 'APPLE', isRevealed: false, showLetters: true, animationTrigger: 1, onAnimationComplete: completed };
  const view = render(<WordOutput {...props} />);
  const output = document.getElementById('typewritter-output')!;
  expect(output.getAttribute('aria-hidden')).toBe('true');
  act(() => vi.advanceTimersByTime(399));
  expect(output.querySelectorAll('.fade-in-output')).toHaveLength(0);
  act(() => vi.advanceTimersByTime(1));
  expect(output.querySelectorAll('.fade-in-output')).toHaveLength(5);
  // Changing a decorative preference must not restart or disclose the puzzle.
  preference(!motion);
  expect(output.getAttribute('aria-hidden')).toBe('true');
  act(() => vi.advanceTimersByTime(400));
  expect(completed).toHaveBeenCalledOnce();
  view.rerender(<WordOutput {...props} animationTrigger={2} />);
  expect(output.querySelectorAll('.fade-in-output')).toHaveLength(0);
  act(() => vi.advanceTimersByTime(400));
  expect(output.querySelectorAll('.fade-in-output')).toHaveLength(5);
  view.unmount();
  act(() => vi.advanceTimersByTime(1000));
  expect(completed).toHaveBeenCalledOnce();
});

it('stops confetti and clears its canvas when reduced motion is enabled mid-celebration', () => {
  const clearRect = vi.fn();
  const context = { clearRect } as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  const frame = vi.fn().mockReturnValue(42);
  const cancel = vi.fn();
  vi.stubGlobal('requestAnimationFrame', frame); vi.stubGlobal('cancelAnimationFrame', cancel);
  render(<HighScoreCelebration />);
  expect(frame).toHaveBeenCalledOnce();
  preference(true);
  expect(cancel).toHaveBeenCalledWith(42);
  expect(clearRect).toHaveBeenCalled();
});
