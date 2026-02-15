export type GamePhase = 'idle' | 'playing' | 'revealing' | 'complete';
export type ModalType = 'none' | 'instructions' | 'finalScore';
export type AttemptResult = 'pending' | 'correct' | 'wrong';

export interface WordResult {
  attempts: number;
  solved: boolean;
}

export interface GameState {
  phase: GamePhase;
  currentWord: string;
  playableWords: string[];
  wordIndex: number;
  attempts: number;
  attemptResults: [AttemptResult, AttemptResult, AttemptResult];
  wordResults: WordResult[];
  wordScores: number[]; // Individual scores for each word
  score: number;
  streak: number;
  streakBonus: number;
  replayCount: number;
  replayPenalty: number;
  timeRemaining: number;
  timerModeEnabled: boolean;
  hardModeEnabled: boolean;
  isDailyChallenge: boolean;
  showLetters: boolean;
  animationTrigger: number; // Increments to force re-animation
}

export type GameAction =
  | { type: 'START_GAME'; words: string[]; initialStreak?: number }
  | { type: 'NEXT_WORD' }
  | { type: 'SUBMIT_GUESS'; guess: string }
  | { type: 'REPLAY_WORD' }
  | { type: 'TRIGGER_ANIMATION' } // Re-trigger letter animation without replay penalty
  | { type: 'TIMER_TICK' }
  | { type: 'TIMER_EXPIRED' }
  | { type: 'REVEAL_WORD'; solved: boolean }
  | { type: 'TOGGLE_HARD_MODE' }
  | { type: 'SET_SHOW_LETTERS'; show: boolean }
  | { type: 'RESET_GAME' }
  | { type: 'RESTORE_STATE'; state: GameState };

export interface SavedGameState {
  state: GameState;
  savedDate: string; // Date string to check if game is from today
}

export interface DailyStats {
  score: number;
  average: number;
  gamesPlayed: number;
  highScore: number;
  history: number[];
  lastPlayed: string | null;
  currentStreak: number;
  // Additional data for showing results modal again
  lastGameResults?: {
    wordResults: WordResult[];
    streakBonus: number;
    wordScores: number[];
    isNewHighScore: boolean;
  };
}

export interface GamePreferences {
  lightMode: boolean;
  soundMuted: boolean;
  timerMode: boolean;
}

export interface HistoryPercentile {
  history: number[];
  percentile: number;
}

// Daily Theme types
export interface DailyTheme {
  themeName: string;
  description: string;
  wordList: string[];
}

export interface ThemesData {
  [date: string]: DailyTheme;
}

export interface UseDailyThemeResult {
  theme: DailyTheme | null;
  isLoading: boolean;
  error: string | null;
}
