import { useMemo, useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { getDailyWords, getDailyNumber } from '../utils/seededRandom';
import type { DailyStats } from '../types/game';

const STORAGE_KEY = 'dscrmbl-daily';

// Helper to check if two dates are consecutive days
function isConsecutiveDay(lastPlayedStr: string, todayStr: string): boolean {
  const lastPlayed = new Date(lastPlayedStr);
  const today = new Date(todayStr);

  // Get yesterday's date string
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return lastPlayed.toDateString() === yesterday.toDateString();
}

export function useDailyChallenge() {
  const [dailyStats, setDailyStats] = useLocalStorage<DailyStats | null>(STORAGE_KEY, null);

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
    if (!dailyStats?.lastPlayed) return;

    const today = new Date().toDateString();
    const lastPlayed = dailyStats.lastPlayed;

    // If last played was today, do nothing
    if (lastPlayed === today) return;

    // If last played was yesterday, streak continues
    if (isConsecutiveDay(lastPlayed, today)) return;

    // Player missed a day - reset streak
    if (dailyStats.currentStreak > 0) {
      const resetStats: DailyStats = {
        ...dailyStats,
        currentStreak: 0
      };
      setDailyStats(resetStats);
    }
  }, [dailyStats, setDailyStats]);

  const dailyNumber = useMemo(() => getDailyNumber(), []);

  const dailyWords = useMemo(() => getDailyWords(), []);

  const canPlayToday = useMemo(() => {
    if (!dailyStats?.lastPlayed) return true;
    const today = new Date().toDateString();
    return dailyStats.lastPlayed !== today;
  }, [dailyStats?.lastPlayed]);

  const todayScore = useMemo(() => {
    if (!dailyStats?.lastPlayed) return null;
    const today = new Date().toDateString();
    if (dailyStats.lastPlayed === today) {
      return dailyStats.score;
    }
    return null;
  }, [dailyStats]);

  const todayResults = useMemo(() => {
    if (!dailyStats?.lastPlayed || !dailyStats?.lastGameResults) return null;
    const today = new Date().toDateString();
    if (dailyStats.lastPlayed === today) {
      return dailyStats.lastGameResults;
    }
    return null;
  }, [dailyStats]);

  const updateDailyStats = useCallback((newStats: DailyStats) => {
    setDailyStats(newStats);
  }, [setDailyStats]);

  const getCurrentStreak = useMemo(() => {
    return dailyStats?.currentStreak ?? 0;
  }, [dailyStats]);

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
    dailyWords,
    canPlayToday,
    todayScore,
    todayResults,
    dailyStats,
    updateDailyStats,
    getCurrentStreak,
    updateStreak
  };
}
