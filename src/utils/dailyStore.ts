import type { CompletedDaily, DailyStats } from '../types/game';
import { calculateFinalScore, getRecordedPercentile } from './scoring';
import { currentDailyStreak, readDailyStats, readProgress, validProgressRecord } from './progress';
import { storedDateKey } from './localDate';
import { getDailyNumber } from './seededRandom';
import { getThemeExplanation } from './themeExplanation';

export const DAILY_KEY = 'dscrmbl-daily';
export const PENDING_DAILY_KEY = 'dscrmbl-pending-daily-v1';
export const STORAGE_WARNING = 'Progress could not be saved on this device. Statistics are available for this session; refresh recovery may be unavailable.';
export type CompletionResult = {
  stats: DailyStats;
  percentile: { history: number[]; percentile: number };
  isNewHighScore: boolean;
  duplicate: boolean;
  persisted: boolean;
};

function applyCompletion(saved: DailyStats | null, input: CompletedDaily) {
  const progress = readProgress(saved?.progress);
  const latest = saved?.lastGameResults;
  // Only import an explicitly dated, mode-labelled latest result that agrees with lastPlayed.
  const imported = latest && { challengeDate: latest.challengeDate, mode: latest.mode,
    score: saved?.score, wordResults: latest.wordResults };
  if (validProgressRecord(imported) && imported.challengeDate === storedDateKey(saved?.lastPlayed) && !progress.records[imported.challengeDate]) {
    progress.records[imported.challengeDate] = imported;
  }
  const duplicate = !!progress.records[input.challengeDate] || storedDateKey(saved?.lastPlayed) === input.challengeDate;
  if (duplicate && saved) return { stats: saved, duplicate: true, isNewHighScore: false };
  const { stats, isNewHighScore, percentile } = calculateFinalScore(input.score, true, saved, input.finalStreak, input.challengeDate);
  const record = { challengeDate: input.challengeDate, score: input.score, mode: input.mode, wordResults: input.results.wordResults };
  if (validProgressRecord(record)) progress.records[input.challengeDate] = record;
  const newerSavedResult = saved && (storedDateKey(saved.lastPlayed) ?? '') > input.challengeDate;
  return { duplicate: false, isNewHighScore, completionPercentile: percentile.percentile, stats: { ...stats, progress, lastGameResults: {
    ...input.results, mode: input.mode, isNewHighScore, percentile: percentile.percentile,
    challengeDate: input.challengeDate, dailyNumber: getDailyNumber(input.challengeDate),
    themeName: input.theme?.themeName, words: input.theme?.wordList,
    explanation: getThemeExplanation(input.theme?.explanation, input.theme?.wordList)
  }, ...(newerSavedResult ? { score: saved.score, lastPlayed: saved.lastPlayed,
    currentStreak: saved.currentStreak, lastGameResults: saved.lastGameResults } : {}) } };
}

/** One store per storage surface keeps failed writes and duplicate guards alive across remounts. */
export class DailyStore {
  private listeners = new Set<() => void>();
  private pending = new Map<string, CompletedDaily>();
  private completed = new Set<string>();
  private snapshot: { stats: DailyStats | null; storageWarning: string | null };
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'>) {
    this.snapshot = this.read();
    this.loadPending();
  }
  private loadPending() {
    try {
      const journal: unknown = JSON.parse(this.storage.getItem(PENDING_DAILY_KEY) || '[]');
      if (Array.isArray(journal)) for (const input of journal) {
        if (validProgressRecord({ ...input, wordResults: input?.results?.wordResults }) &&
          Number.isInteger(input.finalStreak) && input.finalStreak >= 0 && input.results &&
          Array.isArray(input.results.wordScores) && (input.theme === null || Array.isArray(input.theme?.wordList))) {
          if (!this.pending.has(input.challengeDate)) this.pending.set(input.challengeDate, input);
        }
      }
    } catch { /* The main completed-state save remains another recovery path. */ }
  }
  private read() {
    try {
      const raw = this.storage.getItem(DAILY_KEY);
      const stats = readDailyStats(raw ? JSON.parse(raw) : null);
      return { stats, storageWarning: raw && !stats ? 'Saved statistics could not be read. Existing data will remain untouched until a daily completion is recorded.' : null };
    } catch { return { stats: null, storageWarning: STORAGE_WARNING }; }
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(stats: DailyStats | null, storageWarning: string | null) {
    this.snapshot = { stats, storageWarning };
    this.listeners.forEach(listener => listener());
  }
  refresh = () => {
    // A storage event must not drop unsaved completions from this session.
    if (this.pending.size) return;
    const read = this.read();
    this.publish(read.stats, read.storageWarning);
  };
  retryPending = () => {
    for (const input of this.pending.values()) {
      const result = this.record(input);
      if (result instanceof Promise) void result.catch(() => { /* Keep the journal for another restoration. */ });
    }
  };
  private transact<T>(operation: () => T): T | Promise<T> {
    return typeof navigator !== 'undefined' && navigator.locks?.request
      ? navigator.locks.request('dscrmbl-daily-completion', operation).catch(() => operation()) : operation();
  }
  record = (input: CompletedDaily): CompletionResult | Promise<CompletionResult> => this.transact(() => {
    this.loadPending();
    const alreadyInSession = this.completed.has(input.challengeDate);
    let saved: DailyStats | null;
    let readable = true;
    try {
      const raw = this.storage.getItem(DAILY_KEY);
      try { saved = readDailyStats(JSON.parse(raw || 'null')); }
      catch { saved = null; } // Malformed JSON is recoverable on an authorized completion.
    } catch { saved = this.snapshot.stats; readable = false; }
    const needsRetry = this.pending.size > 0;
    let stats = saved;
    for (const pending of this.pending.values()) stats = applyCompletion(stats, pending).stats;
    const applied = applyCompletion(stats, input);
    stats = applied.stats;
    const duplicate = alreadyInSession || applied.duplicate;
    let persisted = readable && !needsRetry && applied.duplicate;
    if (!persisted) {
      try {
        if (!readable) throw new Error('Storage unavailable');
        this.storage.setItem(DAILY_KEY, JSON.stringify(stats));
        persisted = true;
        this.pending.clear();
      } catch { this.pending.set(input.challengeDate, input); }
      // Retain failed completions if a later round replaces the completed game-state save.
      // This is best-effort: an entirely unavailable/full storage surface cannot guarantee recovery.
      try { this.storage.setItem(PENDING_DAILY_KEY, JSON.stringify([...this.pending.values()])); } catch { /* Session memory remains usable. */ }
    }
    this.completed.add(input.challengeDate);
    this.publish(stats, persisted ? null : STORAGE_WARNING);
    return { stats, duplicate, persisted, isNewHighScore: !duplicate && applied.isNewHighScore,
      percentile: { history: stats.history, percentile: duplicate ? getRecordedPercentile(stats.history, input.score) : applied.completionPercentile ?? 100 } };
  });
  updateStreak = (newStreak: number) => this.transact(() => {
    const latest = this.read();
    const stats = this.pending.size || latest.storageWarning ? this.snapshot.stats : latest.stats;
    if (!stats || stats.currentStreak === newStreak) return;
    const updated = { ...stats, currentStreak: newStreak };
    let warning: string | null = null;
    try {
      if (latest.storageWarning || this.pending.size) throw new Error('Unsaved progress');
      this.storage.setItem(DAILY_KEY, JSON.stringify(updated));
    } catch { warning = STORAGE_WARNING; }
    this.publish(updated, warning);
  });
}

const stores = new WeakMap<object, DailyStore>();
let unavailableStore: DailyStore | undefined;
export function getDailyStore() {
  try {
    const storage = window.localStorage;
    let store = stores.get(storage);
    if (!store) { store = new DailyStore(storage); stores.set(storage, store); }
    return store;
  } catch {
    return unavailableStore ??= new DailyStore({ getItem: () => { throw new Error('Unavailable'); }, setItem: () => { throw new Error('Unavailable'); } });
  }
}

export { currentDailyStreak };
