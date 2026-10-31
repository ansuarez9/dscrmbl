import type { DailyProgress, DailyProgressRecord, DailyStats, GameMode, WordResult } from '../types/game';
import { isPreviousCalendarDay, storedDateKey } from './localDate';

export function validChallengeDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validWordResults(value: unknown): value is WordResult[] {
  return Array.isArray(value) && value.length === 5 && value.every(result => result &&
    typeof result.solved === 'boolean' && typeof result.usedReplay === 'boolean' &&
    Number.isInteger(result.attempts) && (result.solved ? result.attempts >= 1 && result.attempts <= 3 : result.attempts === 4));
}

export function validProgressRecord(value: unknown): value is DailyProgressRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as DailyProgressRecord;
  return validChallengeDate(record.challengeDate) && ['normal', 'hard'].includes(record.mode) &&
    Number.isFinite(record.score) && record.score >= 0 && validWordResults(record.wordResults);
}

export function readProgress(value: unknown): DailyProgress {
  const progress = value as DailyProgress | undefined;
  const records: DailyProgress['records'] = {};
  if (progress?.version === 1 && progress.records && typeof progress.records === 'object') {
    Object.entries(progress.records).forEach(([date, record]) => {
      if (validProgressRecord(record) && record.challengeDate === date) records[date] = record;
    });
  }
  return { version: 1, records };
}

/** Normalize older aggregate saves in memory only; viewing statistics never migrates storage. */
export function readDailyStats(value: unknown): DailyStats | null {
  if (!value || typeof value !== 'object') return null;
  const stats = value as DailyStats;
  if (![stats.score, stats.average, stats.gamesPlayed, stats.highScore].every(n => Number.isFinite(n) && n >= 0) ||
    !Number.isInteger(stats.gamesPlayed) || !Array.isArray(stats.history) ||
    !stats.history.every(n => Number.isFinite(n) && n >= 0)) return null;
  return { ...stats, currentStreak: Number.isInteger(stats.currentStreak) && stats.currentStreak >= 0 ? stats.currentStreak : 0 };
}

export function currentDailyStreak(stats: DailyStats | null, date: string): number {
  const last = storedDateKey(stats?.lastPlayed);
  return last && (last === date || isPreviousCalendarDay(last, date)) ? stats?.currentStreak ?? 0 : 0;
}

export function wordCounts(words: WordResult[]) {
  return {
    solved: words.filter(word => word.solved).length,
    firstTry: words.filter(word => word.solved && word.attempts === 1 && !word.usedReplay).length,
    total: words.length
  };
}

export function progressSummary(progress: unknown) {
  const records = Object.values(readProgress(progress).records).sort((a, b) => b.challengeDate.localeCompare(a.challengeDate));
  const modes = (['normal', 'hard'] as GameMode[]).map(mode => {
    const games = records.filter(record => record.mode === mode);
    const counts = wordCounts(games.flatMap(record => record.wordResults));
    return { mode, games: games.length, ...counts,
      high: games.length ? Math.max(...games.map(record => record.score)) : null,
      average: games.length ? Math.round(games.reduce((sum, record) => sum + record.score, 0) / games.length) : null };
  });
  return { recent: records.slice(0, 10), trackedSince: records[records.length - 1]?.challengeDate, modes };
}
