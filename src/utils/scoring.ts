import type { DailyStats, HistoryPercentile } from '../types/game';

export interface ScoreParams {
  wordLength: number;
  attempts: number;
  timerModeEnabled: boolean;
  timeRemaining: number;
  streak: number;
  replayCount: number;
  hardModeEnabled: boolean;
  solved: boolean;
}

export function calculateWordScore(params: ScoreParams): { wordScore: number; newStreak: number; streakBonusAdded: number; timeBonus: number } {
  const { wordLength, attempts, timerModeEnabled, timeRemaining, streak, replayCount, hardModeEnabled, solved } = params;

  if (!solved) {
    return { wordScore: 0, newStreak: 0, streakBonusAdded: 0, timeBonus: 0 };
  }

  let wordScore = wordLength * (4 - attempts);

  // Apply replay bonus (2 points per unused replay)
  const maxReplays = hardModeEnabled ? 3 : 5;
  const replaysRemaining = maxReplays - replayCount;
  const replayBonus = replaysRemaining * 2;
  wordScore += replayBonus;

  // Apply timer bonus: remaining seconds as bonus points in hard mode
  let timeBonus = 0;
  if (hardModeEnabled && timerModeEnabled && timeRemaining > 0) {
    timeBonus = timeRemaining;
    wordScore += timeBonus;
  }

  // Calculate streak bonus
  let newStreak = streak;
  let streakBonusAdded = 0;

  if (attempts === 1 && replayCount === 0) {
    newStreak = streak + 1;
    if (newStreak > 1) {
      streakBonusAdded = newStreak * 2;
      wordScore += streakBonusAdded;
    }
  } else {
    newStreak = 0;
  }

  return { wordScore, newStreak, streakBonusAdded, timeBonus };
}

export function calculateScoreAverage(average: number | undefined, gamesPlayed: number | undefined, score: number): number {
  if (average === undefined || average === null || gamesPlayed === undefined || gamesPlayed === null) {
    return score;
  }
  const newAverage = ((average * gamesPlayed) + score) / (gamesPlayed + 1);
  return newAverage || score;
}

export function getHighScore(highScore: number | undefined, score: number): number {
  if (!highScore) {
    return score;
  }
  return score > highScore ? score : highScore;
}

export function getHistory(history: number[] | undefined, score: number): HistoryPercentile {
  let percentile = 100;
  let updatedHistory: number[];

  if (history && history.length > 0) {
    const insertIdx = history.findIndex(s => s > score);
    if (insertIdx === -1) {
      updatedHistory = [...history, score];
    } else {
      updatedHistory = [...history];
      updatedHistory.splice(insertIdx, 0, score);
      percentile = ((insertIdx + 1) / updatedHistory.length) * 100;
    }
  } else {
    updatedHistory = [score];
  }

  return {
    history: updatedHistory,
    percentile: Math.round(percentile)
  };
}

export function calculateFinalScore(score: number, isDailyChallenge: boolean, cached: DailyStats | null, finalStreak: number): { stats: DailyStats; percentile: HistoryPercentile; isNewHighScore: boolean } {
  const validScore = isNaN(score) ? 0 : score;

  const average = calculateScoreAverage(cached?.average, cached?.gamesPlayed, validScore);
  const gamesPlayed = (cached?.gamesPlayed ?? 0) + 1;
  const highScore = getHighScore(cached?.highScore, validScore);
  const historyPercentile = getHistory(cached?.history, validScore);

  const isNewHighScore = validScore > (cached?.highScore ?? 0);

  const stats: DailyStats = {
    score: validScore,
    average: isNaN(average) ? validScore : average,
    gamesPlayed,
    highScore: isNaN(highScore) ? validScore : highScore,
    history: historyPercentile.history,
    lastPlayed: isDailyChallenge ? new Date().toDateString() : cached?.lastPlayed ?? null,
    currentStreak: finalStreak
  };

  return { stats, percentile: historyPercentile, isNewHighScore };
}
