import { describe, expect, it } from 'vitest';
import { currentDailyStreak, progressSummary, readDailyStats, readProgress, validProgressRecord } from './progress';
import type { DailyProgressRecord, DailyStats } from '../types/game';

const mixed = [
  { solved: true, attempts: 1, usedReplay: false },
  { solved: true, attempts: 1, usedReplay: true },
  { solved: true, attempts: 2, usedReplay: false },
  { solved: false, attempts: 4, usedReplay: false },
  { solved: false, attempts: 4, usedReplay: true }
];
export const record = (challengeDate = '2026-10-26', score = 100, mode: 'normal' | 'hard' = 'normal'): DailyProgressRecord => ({ challengeDate, score, mode, wordResults: mixed });

describe('daily progress selectors', () => {
  it('counts all presented words, including misses/timeouts, and separates modes', () => {
    const normal = record(); const hard = record('2026-10-27', 250, 'hard');
    const summary = progressSummary({ version: 1, records: { [normal.challengeDate]: normal, [hard.challengeDate]: hard } });
    expect(summary.trackedSince).toBe('2026-10-26');
    expect(summary.modes[0]).toMatchObject({ mode: 'normal', games: 1, solved: 3, firstTry: 1, total: 5, high: 100, average: 100 });
    expect(summary.modes[1]).toMatchObject({ mode: 'hard', games: 1, high: 250, average: 250 });
  });
  it('limits recent rows to 10 but uses every recorded game for rates', () => {
    const records = Object.fromEntries(Array.from({ length: 12 }, (_, index) => {
      const game = record(`2026-10-${String(index + 1).padStart(2, '0')}`, index);
      return [game.challengeDate, game];
    }));
    const summary = progressSummary({ version: 1, records });
    expect(summary.recent).toHaveLength(10);
    expect(summary.recent[0].challengeDate).toBe('2026-10-12');
    expect(summary.trackedSince).toBe('2026-10-01');
    expect(summary.modes[0]).toMatchObject({ games: 12, total: 60, firstTry: 12, solved: 36, average: 6 });
  });
  it.each([undefined, null, {}, { version: 2, records: {} }, { version: 1, records: null }])('handles empty/incompatible history %j', progress => {
    expect(progressSummary(progress)).toMatchObject({ recent: [], trackedSince: undefined });
    expect(progressSummary(progress).modes[0]).toMatchObject({ games: 0, total: 0, high: null, average: null });
  });
  it.each([
    { challengeDate: '2026-02-30' }, { challengeDate: 'yesterday' }, { score: Infinity }, { score: -1 },
    { mode: undefined }, { mode: 'unknown' }, { wordResults: mixed.slice(1) },
    { wordResults: [{ solved: true, attempts: 0, usedReplay: false }, ...mixed.slice(1)] },
    { wordResults: [{ solved: true, attempts: 1 }, ...mixed.slice(1)] }
  ])('rejects invalid records %j', invalid => {
    expect(validProgressRecord({ ...record(), ...invalid })).toBe(false);
  });
  it('rejects mismatched record keys and does not mutate the source', () => {
    const original = { version: 1, records: { '2026-10-25': record() } };
    const text = JSON.stringify(original);
    expect(readProgress(original).records).toEqual({});
    expect(JSON.stringify(original)).toBe(text);
  });
  it('normalizes missing streak without changing older data, and derives missed-day streaks', () => {
    const old = { score: 20, average: 20, gamesPlayed: 1, highScore: 20, history: [20], lastPlayed: '2026-10-24' };
    expect(readDailyStats(old)?.currentStreak).toBe(0);
    expect('currentStreak' in old).toBe(false);
    const stats = { ...old, currentStreak: 5 } as DailyStats;
    expect(currentDailyStreak(stats, '2026-10-25')).toBe(5);
    expect(currentDailyStreak(stats, '2026-10-26')).toBe(0);
    expect(readDailyStats({ ...old, history: 'bad' })).toBeNull();
  });
});
