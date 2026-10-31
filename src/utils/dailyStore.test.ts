// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { DAILY_KEY, PENDING_DAILY_KEY, DailyStore, STORAGE_WARNING } from './dailyStore';
import type { CompletedDaily, DailyStats } from '../types/game';

const words = Array.from({ length: 5 }, () => ({ solved: true, attempts: 1, usedReplay: false }));
const input = (date = '2026-10-26', mode: 'normal' | 'hard' = 'normal'): CompletedDaily => ({
  challengeDate: date, mode, score: 100, finalStreak: 5,
  results: { wordResults: words, wordScores: [20, 20, 20, 20, 20], streakBonus: 0, isNewHighScore: false }, theme: null
});
function setup(legacy: unknown = null) {
  const data = new Map<string, string>([[DAILY_KEY, JSON.stringify(legacy)]]);
  const storage = { getItem: vi.fn((key: string) => data.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { data.set(key, value); }) };
  return { storage, store: new DailyStore(storage), read: () => JSON.parse(data.get(DAILY_KEY)!) as DailyStats };
}
afterEach(() => vi.restoreAllMocks());

it('commits lifetime, latest snapshot, and dated mode/outcomes in a single write', async () => {
  const { store, storage, read } = setup();
  const completion = await store.record(input());
  expect(storage.setItem.mock.calls.filter(([key]) => key === DAILY_KEY)).toHaveLength(1);
  expect(storage.setItem.mock.calls[0][0]).toBe(DAILY_KEY);
  expect(completion).toMatchObject({ persisted: true, duplicate: false });
  expect(read()).toMatchObject({ gamesPlayed: 1, history: [100], lastGameResults: { mode: 'normal' }, progress: { version: 1, records: { '2026-10-26': { mode: 'normal', wordResults: words } } } });
});
it('deduplicates repeat calls, remounts, and older dates even after another completion', async () => {
  const { store, storage, read } = setup();
  await store.record(input());
  expect((await store.record(input())).duplicate).toBe(true);
  const remount = new DailyStore(storage);
  expect((await remount.record(input())).duplicate).toBe(true);
  await remount.record(input('2026-10-27', 'hard'));
  expect((await remount.record(input())).duplicate).toBe(true);
  expect(read().gamesPlayed).toBe(2);
  expect(read().history).toEqual([100, 100]);
  expect(Object.keys(read().progress!.records)).toHaveLength(2);
  expect(storage.setItem.mock.calls.filter(([key]) => key === DAILY_KEY)).toHaveLength(2);
});
it('keeps old aggregate data and excludes legacy latest results without an explicit mode', async () => {
  const legacy = { score: 80, average: 70, highScore: 90, gamesPlayed: 2, history: [50, 90], lastPlayed: '2026-10-25', currentStreak: 0,
    lastGameResults: { ...input().results, challengeDate: '2026-10-25' } };
  const { store, read } = setup(legacy);
  await store.record(input());
  expect(read()).toMatchObject({ gamesPlayed: 3, highScore: 100, average: 80 });
  expect(Object.keys(read().progress!.records)).toEqual(['2026-10-26']);
});
it('imports only a consistent fully specified latest result without recounting lifetime totals', async () => {
  const latest = { score: 80, average: 80, highScore: 80, gamesPlayed: 1, history: [80], lastPlayed: '2026-10-25', currentStreak: 0,
    lastGameResults: { ...input().results, mode: 'hard', challengeDate: '2026-10-25' } };
  const { store, read } = setup(latest);
  await store.record(input());
  expect(read().gamesPlayed).toBe(2);
  expect(Object.keys(read().progress!.records)).toHaveLength(2);
  expect(read().progress!.records['2026-10-25'].mode).toBe('hard');
});
it('provides session-only results on quota failure and retries without double-counting', async () => {
  const { store, storage, read } = setup();
  storage.setItem.mockImplementationOnce(() => { throw new Error('Quota'); });
  expect((await store.record(input())).persisted).toBe(false);
  expect(read()).toBeNull();
  expect(store.getSnapshot()).toMatchObject({ storageWarning: STORAGE_WARNING, stats: { gamesPlayed: 1 } });
  expect((await store.record(input())).duplicate).toBe(true);
  expect(read().gamesPlayed).toBe(1);
  expect(store.getSnapshot().storageWarning).toBeNull();
});
it('keeps several unsaved completions and retries them at the next completion', async () => {
  const { store, storage, read } = setup();
  storage.setItem.mockImplementationOnce(() => { throw new Error('Quota'); });
  await store.record(input());
  await store.record(input('2026-10-27', 'hard'));
  expect(read().gamesPlayed).toBe(2);
  expect(read().progress!.records['2026-10-26']).toBeTruthy();
});
it('handles blocked reads and writes without losing usable session totals', async () => {
  const storage = { getItem: () => { throw new Error('Blocked'); }, setItem: () => { throw new Error('Blocked'); } };
  const store = new DailyStore(storage);
  await store.record(input());
  await store.record(input());
  await store.record(input('2026-10-27'));
  expect(store.getSnapshot()).toMatchObject({ storageWarning: STORAGE_WARNING, stats: { gamesPlayed: 2 } });
});
it('serializes two stores through Web Locks and reads the current data inside the lock', async () => {
  const { storage, read } = setup();
  let queue: Promise<unknown> = Promise.resolve();
  const request = vi.fn((_name, callback) => { const result = queue.then(callback); queue = result; return result; });
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
  try {
    const a = new DailyStore(storage); const b = new DailyStore(storage);
    const results = await Promise.all([a.record(input()), b.record(input()), b.record(input('2026-10-27', 'hard'))]);
    expect(results[1].duplicate).toBe(true);
    expect(read().gamesPlayed).toBe(2);
    expect(request).toHaveBeenCalledTimes(3);
  } finally { Reflect.deleteProperty(navigator, 'locks'); }
});
it('reads and refreshes without writing or normalizing the persisted bytes', () => {
  const { storage, store } = setup({ score: 1, highScore: 1, average: 1, gamesPlayed: 1, history: [1], lastPlayed: '2026-10-01' });
  store.refresh(); store.getSnapshot();
  expect(storage.setItem).not.toHaveBeenCalled();
  expect(store.getSnapshot().stats?.currentStreak).toBe(0);
});

it('restores a failed completion from the journal before a later game can replace it', async () => {
  const { store, storage, read } = setup();
  storage.setItem.mockImplementationOnce(() => { throw new Error('Daily quota'); });
  await store.record(input());
  expect(JSON.parse(storage.getItem(PENDING_DAILY_KEY)!)).toHaveLength(1);
  const restarted = new DailyStore(storage);
  restarted.retryPending();
  expect(read().gamesPlayed).toBe(1);
  expect(read().progress!.records['2026-10-26']).toBeTruthy();
  expect(JSON.parse(storage.getItem(PENDING_DAILY_KEY)!)).toEqual([]);
});

it('recovers an older missing completion without moving the latest result or streak backwards', async () => {
  const { store, read } = setup();
  await store.record(input('2026-10-27', 'hard'));
  await store.record({ ...input('2026-10-26'), score: 50, finalStreak: 0 });
  expect(read()).toMatchObject({ gamesPlayed: 2, lastPlayed: '2026-10-27', score: 100, currentStreak: 5,
    lastGameResults: { challengeDate: '2026-10-27', mode: 'hard' } });
  expect(read().progress!.records['2026-10-26'].score).toBe(50);
});

it('merges a recovery journal created by another tab after this store initialized', async () => {
  const { storage, read } = setup();
  const a = new DailyStore(storage); const b = new DailyStore(storage);
  storage.setItem.mockImplementationOnce(() => { throw new Error('Quota'); });
  await a.record(input());
  await b.record(input('2026-10-27', 'hard'));
  expect(read().gamesPlayed).toBe(2);
  expect(Object.keys(read().progress!.records)).toHaveLength(2);
});

it('can record a new daily after malformed JSON without inventing prior aggregates', async () => {
  const { storage, read } = setup();
  storage.setItem(DAILY_KEY, '{malformed');
  const store = new DailyStore(storage);
  expect(store.getSnapshot().storageWarning).toBeTruthy();
  await store.record(input());
  expect(read().gamesPlayed).toBe(1);
  expect(Object.keys(read().progress!.records)).toEqual(['2026-10-26']);
});
