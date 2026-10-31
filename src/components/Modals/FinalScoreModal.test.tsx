// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FinalScoreModal } from './FinalScoreModal';
import type { ThemeExplanation } from '../../types/game';

vi.mock('../../context/AudioContext', () => ({ useAudioContext: () => ({ playTickSound: silent }) }));
const silent = () => {};
const words = ['anvil', 'hammer', 'smith', 'bellows', 'ironwork'];
const explanation = { summary: 'A blacksmith’s workshop.', wordNotes: { bellows: 'Feeds air to the fire.' } };
const props = {
  isOpen: true, onClose: vi.fn(), dailyNumber: 1, isDailyChallenge: true, score: 50,
  stats: null, percentile: { history: [], percentile: 100 }, words,
  wordResults: words.map((_, index) => ({ attempts: index === 2 ? 4 : 1, solved: index !== 2, usedReplay: false })),
  streakBonus: 0, isNewHighScore: false, explanation
};

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('starts collapsed beneath sharing and lists all five answers, including a missed word', () => {
  render(<FinalScoreModal {...props} />);
  const details = document.querySelector('details')!;
  expect(details.open).toBe(false);
  expect(document.getElementById('share-btn')!.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(within(details).getAllByRole('listitem', { hidden: true })).toHaveLength(5);
  expect(within(details).getByText('SMITH')).toBeTruthy();
  expect(within(details).getByText('Feeds air to the fire.').closest('li')?.textContent).toContain('BELLOWS');
  expect(within(details).getByText('HAMMER').closest('li')?.querySelector('span')).toBeNull();
});

it('renders summary-only explanations and resets an expanded disclosure on reopening', () => {
  const view = render(<FinalScoreModal {...props} explanation={{ summary: 'A workshop.' }} />);
  const details = document.querySelector('details')!;
  details.open = true;
  view.rerender(<FinalScoreModal {...props} isOpen={false} />);
  expect(document.querySelector('details')).toBeNull();
  view.rerender(<FinalScoreModal {...props} />);
  expect(document.querySelector('details')!.open).toBe(false);
});

it.each([undefined, { summary: ' ' }, { summary: 'Valid', wordNotes: { wrong: 'Mismatched note' } }])(
  'omits absent or invalid explanations', value => {
    render(<FinalScoreModal {...props} explanation={value} />);
    expect(screen.queryByText('How the words connect')).toBeNull();
  }
);

it('does not disclose explanations for fewer than five outcomes or missing puzzle words', () => {
  const view = render(<FinalScoreModal {...props} wordResults={props.wordResults.slice(0, 4)} />);
  expect(screen.queryByText(explanation.summary)).toBeNull();
  view.rerender(<FinalScoreModal {...props} words={undefined} />);
  expect(screen.queryByText('How the words connect')).toBeNull();
});

it('renders authored text literally', () => {
  render(<FinalScoreModal {...props} explanation={{ summary: '<script>not markup</script>' } as ThemeExplanation} />);
  expect(screen.getByText('<script>not markup</script>')).toBeTruthy();
  expect(document.querySelector('script')).toBeNull();
});

it('labels the dialog, traps focus, closes with Escape, and restores the opener', () => {
  const opener = document.createElement('button');
  document.body.append(opener);
  opener.focus();
  const onClose = vi.fn();
  const view = render(<FinalScoreModal {...props} onClose={onClose} />);
  const dialog = screen.getByRole('dialog', { name: 'DAILY #1' });
  expect(document.activeElement).toBe(dialog);
  fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
  expect(document.activeElement?.tagName).toBe('SUMMARY');
  fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close results' }));
  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledOnce();
  view.unmount();
  expect(document.activeElement).toBe(opener);
  opener.remove();
});

it.each(['clipboard', 'native share'])('keeps %s text spoiler-free', async method => {
  const send = vi.fn().mockResolvedValue(true);
  vi.stubGlobal('navigator', { userAgent: method === 'native share' ? 'iPhone' : 'Desktop',
    maxTouchPoints: 0, clipboard: { writeText: send }, share: method === 'native share' ? send : undefined });
  render(<FinalScoreModal {...props} />);
  fireEvent.click(document.getElementById('share-btn')!);
  await Promise.resolve();
  expect(send).toHaveBeenCalledOnce();
  const text = method === 'native share' ? send.mock.calls[0][0].text : send.mock.calls[0][0];
  expect(text).toContain('DSCRMBL Daily #1');
  for (const word of words) expect(text.toLowerCase()).not.toContain(word);
  expect(text).not.toContain(explanation.summary);
  expect(text).not.toContain(explanation.wordNotes.bellows);
});

it('preserves the score payload and optional link without including personal progress', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { userAgent: 'Desktop', maxTouchPoints: 0, clipboard: { writeText } });
  render(<FinalScoreModal {...props} themeName="Workshop" />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Include link to DSCRMBL' }));
  fireEvent.click(document.getElementById('share-btn')!);
  await Promise.resolve();
  expect(writeText.mock.calls[0][0]).toBe('DSCRMBL Daily #1\nWorkshop\nScore: 50 / High: 50\n🟩🟩🟥🟩🟩\n');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Include link to DSCRMBL' }));
  fireEvent.click(document.getElementById('share-btn')!);
  await Promise.resolve();
  expect(writeText.mock.calls[1][0]).toBe('DSCRMBL Daily #1\nWorkshop\nScore: 50 / High: 50\n🟩🟩🟥🟩🟩\n\n' + window.location.origin);
});

it('keeps native-share cancellation quiet and does not copy as a side effect', async () => {
  const writeText = vi.fn();
  const share = vi.fn().mockRejectedValue(Object.assign(new Error('Cancelled'), { name: 'AbortError' }));
  vi.stubGlobal('navigator', { userAgent: 'iPhone', maxTouchPoints: 1, clipboard: { writeText }, share });
  render(<FinalScoreModal {...props} />);
  fireEvent.click(document.getElementById('share-btn')!);
  await Promise.resolve(); await Promise.resolve();
  expect(writeText).not.toHaveBeenCalled();
  expect(document.getElementById('share-btn')!.textContent).toContain('SHARE SCORE');
});
