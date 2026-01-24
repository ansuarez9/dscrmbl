import { useMemo, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { getDailyWords, getDailyNumber } from '../utils/seededRandom';
import type { DailyStats } from '../types/game';

const STORAGE_KEY = 'dscrmbl-daily';

export function useDailyChallenge() {
  const [dailyStats, setDailyStats] = useLocalStorage<DailyStats | null>(STORAGE_KEY, null);

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

  return {
    dailyNumber,
    dailyWords,
    canPlayToday,
    todayScore,
    todayResults,
    dailyStats,
    updateDailyStats
  };
}
