import { useEffect, useState, useSyncExternalStore } from 'react';
import { getDailyNumber } from '../utils/seededRandom';
import { storedDateKey } from '../utils/localDate';
import { DAILY_KEY, currentDailyStreak, getDailyStore } from '../utils/dailyStore';

export function useDailyChallenge(today: string, dailyRoundActive = false, activeRoundDate: string | null = null) {
  const [store] = useState(getDailyStore);
  const { stats: dailyStats, storageWarning } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    store.refresh();
    store.retryPending();
    const onStorage = (event: StorageEvent) => {
      if (event.key === DAILY_KEY || event.key === null) store.refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [store]);
  const playedToday = storedDateKey(dailyStats?.lastPlayed) === today;
  return {
    dailyNumber: getDailyNumber(today), canPlayToday: !playedToday,
    todayScore: playedToday ? dailyStats?.score ?? null : null,
    todayResults: playedToday ? dailyStats?.lastGameResults ?? null : null,
    dailyStats, storageWarning, recordDailyCompletion: store.record,
    getCurrentStreak: currentDailyStreak(dailyStats, dailyRoundActive && activeRoundDate ? activeRoundDate : today),
    updateStreak: store.updateStreak
  };
}
