// @vitest-environment jsdom
import { StrictMode, useState } from 'react';
import { act, cleanup, configure, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { InstructionsModal } from './InstructionsModal';
import { ContactModal } from './ContactModal';
import { FinalScoreModal } from './FinalScoreModal';

// RTL only recognizes Jest fake timers in its default async wrapper.
// user-event advances the Vitest clock; its dispatched events retain RTL act wrapping.
configure({ asyncWrapper: callback => callback() });

vi.mock('../../context/AudioContext', () => ({ useAudioContext: () => ({ playTickSound: () => {} }) }));
const scoreProps = { dailyNumber: 1, isDailyChallenge: true, score: 50, stats: null,
  percentile: { history: [], percentile: 100 }, wordResults: [], streakBonus: 0, isNewHighScore: false };
const modals = [
  { name: 'Instructions', Component: InstructionsModal, id: 'instruction-modal', backdrop: true },
  { name: 'Contact', Component: ContactModal, id: 'contact-modal', backdrop: false },
  { name: 'Results', Component: (props: { isOpen: boolean; onClose: () => void }) => <FinalScoreModal {...scoreProps} {...props} />, id: 'final-score-modal', backdrop: true }
];

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it.each(modals)('$name contains keyboard focus, closes on Escape and restores the opener after exit', async ({ Component }) => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  function Harness() {
    const [open, setOpen] = useState(false);
    return <><button onClick={() => setOpen(true)}>Open</button><button>Background</button>
      <Component isOpen={open} onClose={() => setOpen(false)} /></>;
  }
  const view = render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Open' }));
  const dialog = screen.getByRole('dialog');
  expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
  expect(document.activeElement).toBe(dialog);
  expect(view.container.inert).toBe(true);
  expect(view.container.getAttribute('aria-hidden')).toBe('true');
  expect(document.body.style.overflow).toBe('hidden');
  await user.tab();
  const first = document.activeElement;
  expect(dialog.contains(first)).toBe(true);
  await user.tab({ shift: true });
  const last = document.activeElement;
  expect(dialog.contains(last)).toBe(true);
  await user.tab();
  expect(document.activeElement).toBe(first);
  // Programmatic focus is contained too (inert is not implemented by jsdom).
  (view.container.querySelectorAll('button')[1] as HTMLElement).focus();
  expect(document.activeElement).toBe(dialog);
  await user.keyboard('{Escape}');
  expect(view.container.inert).toBe(true);
  act(() => vi.advanceTimersByTime(250));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(view.container.inert).toBeFalsy();
  expect(view.container.hasAttribute('aria-hidden')).toBe(false);
  expect(document.activeElement?.textContent).toBe('Open');
  expect(document.body.style.overflow).toBe('');
});

it.each(modals)('$name retains its backdrop policy and uses a fallback when the opener disappears', ({ Component, id, backdrop }) => {
  const opener = document.createElement('button'); document.body.append(opener); opener.focus();
  const onClose = vi.fn();
  const view = render(<><button id="view-results">View results</button><Component isOpen onClose={onClose} /></>);
  fireEvent.click(document.getElementById(id)!);
  expect(onClose).toHaveBeenCalledTimes(backdrop ? 1 : 0);
  opener.remove();
  view.rerender(<><button id="view-results">View results</button><Component isOpen={false} onClose={onClose} /></>);
  act(() => vi.advanceTimersByTime(250));
  expect(document.activeElement?.id).toBe('view-results');
});

it('Contact validates before sending and announces mocked sending, error and success states', async () => {
  const send = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true });
  vi.stubGlobal('fetch', send);
  const view = render(<ContactModal isOpen onClose={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'SEND MESSAGE' }));
  expect(send).not.toHaveBeenCalled();
  expect(document.activeElement?.id).toBe('theme-name');
  expect(screen.getByRole('status').textContent).toContain('Complete the required fields');
  fireEvent.change(screen.getByLabelText(/THEME NAME/), { target: { value: 'Tools' } });
  fireEvent.click(screen.getByRole('button', { name: 'SEND MESSAGE' }));
  expect(screen.getByRole('status').textContent).toContain('Sending');
  await act(async () => { await Promise.resolve(); });
  expect(screen.getByRole('status').textContent).toContain('Failed to send');
  fireEvent.click(screen.getByRole('button', { name: 'SEND MESSAGE' }));
  await act(async () => { await Promise.resolve(); });
  expect(screen.getByRole('status').textContent).toContain('MESSAGE SENT');
  expect(document.activeElement).toBe(screen.getByRole('status'));
  view.unmount();
});

it('closes immediately with reduced motion and preserves pre-existing background attributes', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const view = render(<InstructionsModal isOpen={false} onClose={() => {}} />);
  view.container.setAttribute('aria-hidden', 'false');
  view.container.inert = true;
  view.rerender(<InstructionsModal isOpen onClose={() => {}} />);
  view.rerender(<InstructionsModal isOpen={false} onClose={() => {}} />);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(view.container.inert).toBe(true);
  expect(view.container.getAttribute('aria-hidden')).toBe('false');
});

it('preserves the original opener when Strict Mode replays an initially open modal', () => {
  const opener = document.createElement('button'); document.body.append(opener); opener.focus();
  const view = render(<StrictMode><InstructionsModal isOpen onClose={() => {}} /></StrictMode>);
  expect(document.activeElement).toBe(screen.getByRole('dialog'));
  view.unmount();
  expect(document.activeElement).toBe(opener);
  opener.remove();
});
