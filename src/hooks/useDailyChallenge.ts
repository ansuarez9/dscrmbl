import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { getDailyNumber } from '../utils/seededRandom';
import type { DailyStats } from '../types/game';
import { calculateFinalScore } from '../utils/scoring';
import type { DailyTheme } from '../types/game';
import { isPreviousCalendarDay, storedDateKey } from '../utils/localDate';

const STORAGE_KEY = 'dscrmbl-daily';

export function useDailyChallenge(today: string, dailyRoundActive = false, activeRoundDate: string | null = null) {
  const [dailyStats, setDailyStats] = useLocalStorage<DailyStats | null>(STORAGE_KEY, null);
  const completedDateRef = useRef<string | null>(null);

  // Data migration: Add currentStreak to existing stats
  useEffect(() => {
    if (dailyStats && dailyStats.currentStreak === undefined) {
      const migratedStats: DailyStats = {
        ...dailyStats,
        currentStreak: 0
      };
      setDailyStats(migratedStats);
    }
  }, [dailyStats, setDailyStats]);

  // Reset streak if player missed a day
  useEffect(() => {
    if (!dailyStats?.lastPlayed || dailyRoundActive) return;
    const lastPlayed = storedDateKey(dailyStats.lastPlayed);

    // If last played was today, do nothing
    if (lastPlayed === today) return;

    // If last played was yesterday, streak continues
    if (lastPlayed && isPreviousCalendarDay(lastPlayed, today)) return;

    // Player missed a day - reset streak
    if (dailyStats.currentStreak > 0) {
      const resetStats: DailyStats = {
        ...dailyStats,
        currentStreak: 0
      };
      setDailyStats(resetStats);
    }
  }, [dailyStats, dailyRoundActive, today, setDailyStats]);

  const dailyNumber = useMemo(() => getDailyNumber(today), [today]);

  const canPlayToday = useMemo(() => {
    if (!dailyStats?.lastPlayed) return true;
    return storedDateKey(dailyStats.lastPlayed) !== today;
  }, [dailyStats?.lastPlayed, today]);

  const todayScore = useMemo(() => {
    if (!dailyStats?.lastPlayed) return null;
    if (storedDateKey(dailyStats.lastPlayed) === today) {
      return dailyStats.score;
    }
    return null;
  }, [dailyStats, today]);

  const todayResults = useMemo(() => {
    if (!dailyStats?.lastPlayed || !dailyStats?.lastGameResults) return null;
    if (storedDateKey(dailyStats.lastPlayed) === today) {
      return dailyStats.lastGameResults;
    }
    return null;
  }, [dailyStats, today]);

  const updateDailyStats = useCallback((newStats: DailyStats) => {
    setDailyStats(newStats);
  }, [setDailyStats]);

  const recordDailyCompletion = useCallback((score: number, streak: number, results: NonNullable<DailyStats['lastGameResults']>, theme: DailyTheme | null, challengeDate: string) => {
    let saved: DailyStats | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as DailyStats | null;
    } catch {
      // A malformed older save should not prevent a new completion.
    }
    if (completedDateRef.current === challengeDate || storedDateKey(saved?.lastPlayed) === challengeDate) {
      return null;
    }
    completedDateRef.current = challengeDate;
    const { stats, percentile, isNewHighScore } = calculateFinalScore(score, true, saved, streak, challengeDate);
    const recorded = {
      ...stats,
      lastGameResults: {
        ...results,
        isNewHighScore,
        percentile: percentile.percentile,
        challengeDate,
        dailyNumber: getDailyNumber(challengeDate),
        themeName: theme?.themeName,
        words: theme?.wordList
      }
    };
    setDailyStats(recorded);
    return { stats: recorded, percentile, isNewHighScore };
  }, [setDailyStats]);

  const getCurrentStreak = useMemo(() => {
    const lastPlayed = storedDateKey(dailyStats?.lastPlayed);
    const relevantDay = dailyRoundActive && activeRoundDate ? activeRoundDate : today;
    return lastPlayed === relevantDay || (lastPlayed && isPreviousCalendarDay(lastPlayed, relevantDay))
      ? dailyStats?.currentStreak ?? 0 : 0;
  }, [dailyStats, today, dailyRoundActive, activeRoundDate]);

  const updateStreak = useCallback((newStreak: number) => {
    if (!dailyStats) return;

    const updatedStats: DailyStats = {
      ...dailyStats,
      currentStreak: newStreak
    };
    setDailyStats(updatedStats);
  }, [dailyStats, setDailyStats]);

  return {
    dailyNumber,
    canPlayToday,
    todayScore,
    todayResults,
    dailyStats,
    updateDailyStats,
    recordDailyCompletion,
    getCurrentStreak,
    updateStreak
  };
}
