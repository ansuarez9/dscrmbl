// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useDailyTheme } from './useDailyTheme';

const daily = { themeName: 'DAILY', description: 'Today', wordList: ['apple', 'beach', 'cloud', 'dance', 'earth'] };
const fallback = { themeName: 'BACKUP', description: 'Practice', wordList: ['flame', 'grape', 'house', 'ivory', 'jelly'] };
const today = '2026-10-26';
const response = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it.each([
  ['network', () => Promise.reject(new Error('offline'))],
  ['HTTP', () => Promise.resolve(response({}, false))],
  ['JSON', () => Promise.resolve({ ok: true, json: async () => { throw new SyntaxError('bad JSON'); } } as unknown as Response)]
])('shows a recoverable %s failure without a daily theme', async (_kind, failure) => {
  vi.stubGlobal('fetch', vi.fn(failure));
  const { result } = renderHook(() => useDailyTheme(today));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.theme).toBeNull();
  expect(result.current.error).toContain("couldn't load today's challenge");
  expect(result.current.practiceTheme.wordList).toHaveLength(5);
});

it('uses a loaded fallback only for practice when today is missing', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ _fallback: fallback })));
  const { result } = renderHook(() => useDailyTheme(today));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.theme).toBeNull();
  expect(result.current.practiceTheme).toEqual(fallback);
  expect(result.current.error).toContain("isn't available");
});

it('uses built-in practice words when loaded data has no usable fallback', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ _fallback: { ...fallback, wordList: [] } })));
  const { result } = renderHook(() => useDailyTheme(today));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.theme).toBeNull();
  expect(result.current.practiceTheme.themeName).toBe('GENERAL');
});

it('retries once while pending, then makes the daily theme available', async () => {
  let resolveRetry!: (value: Response) => void;
  const fetchMock = vi.fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockImplementationOnce(() => new Promise<Response>(resolve => { resolveRetry = resolve; }));
  vi.stubGlobal('fetch', fetchMock);
  const { result } = renderHook(() => useDailyTheme(today));
  await waitFor(() => expect(result.current.error).not.toBeNull());
  act(() => {
    result.current.retry();
    result.current.retry();
  });
  expect(result.current.isLoading).toBe(true);
  expect(result.current.error).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await act(async () => resolveRetry(response({ [today]: daily })));
  expect(result.current.isLoading).toBe(false);
  expect(result.current.theme).toEqual(daily);
  expect(result.current.error).toBeNull();
});

it('keeps recovery available after a failed retry', async () => {
  const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
  vi.stubGlobal('fetch', fetchMock);
  const { result } = renderHook(() => useDailyTheme(today));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  act(() => result.current.retry());
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.error).not.toBeNull();
  expect(result.current.theme).toBeNull();
});

it('rejects malformed content for today instead of making it a daily round', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ [today]: { ...daily, wordList: [] }, _fallback: fallback })));
  const { result } = renderHook(() => useDailyTheme(today));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.theme).toBeNull();
  expect(result.current.practiceTheme).toEqual(fallback);
});

it('ignores a prior-day response when the requested date changes', async () => {
  let resolveOld!: (value: Response) => void;
  const next = '2026-10-27';
  const tomorrow = { ...daily, themeName: 'TOMORROW' };
  const fetchMock = vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { resolveOld = resolve; }))
    .mockResolvedValueOnce(response({ [next]: tomorrow }));
  vi.stubGlobal('fetch', fetchMock);
  const { result, rerender } = renderHook(({ dateKey }) => useDailyTheme(dateKey), { initialProps: { dateKey: today } });
  rerender({ dateKey: next });
  await waitFor(() => expect(result.current.theme).toEqual(tomorrow));
  await act(async () => resolveOld(response({ [today]: daily })));
  expect(result.current.theme).toEqual(tomorrow);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});


it('keeps daily and practice playable when optional explanation content is malformed', async () => {
  const malformed = { summary: 'Valid summary', wordNotes: { absent: 'Not a puzzle word' } };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({
    [today]: { ...daily, explanation: malformed }, _fallback: { ...fallback, explanation: malformed }
  })));
  const { result } = renderHook(() => useDailyTheme(today));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.error).toBeNull();
  expect(result.current.theme?.wordList).toEqual(daily.wordList);
  expect(result.current.practiceTheme.wordList).toEqual(fallback.wordList);
});
