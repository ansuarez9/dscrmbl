import type { GameState, GameAction, AttemptResult } from '../types/game';
import { calculateWordScore } from './scoring';

export const WORD_TIME_MS = 20_000;

export const initialState: GameState = {
  phase: 'idle',
  currentWord: '',
  playableWords: [],
  wordIndex: 0,
  attempts: 1,
  attemptResults: ['pending', 'pending', 'pending'],
  wordResults: [],
  wordScores: [],
  score: 0,
  streak: 0,
  streakBonus: 0,
  replayCount: 0,
  replayPenalty: 0,
  lastTimeBonus: 0,
  wordDeadline: null,
  timerModeEnabled: false,
  hardModeEnabled: false,
  isDailyChallenge: true,
  roundTheme: null,
  roundDate: null,
  showLetters: false,
  animationTrigger: 0
};

function expireWord(state: GameState): GameState {
  const attemptIndex = state.attempts - 1;
  const attemptResults: [AttemptResult, AttemptResult, AttemptResult] = [...state.attemptResults];
  attemptResults[attemptIndex] = 'wrong';

  return {
    ...state,
    phase: 'revealing',
    wordDeadline: null,
    attemptResults,
    streak: 0,
    wordResults: [...state.wordResults, { attempts: 4, solved: false, usedReplay: state.replayCount > 0 }],
    wordScores: [...state.wordScores, 0],
    showLetters: false
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const words = action.theme.wordList;
      const initialStreak = action.initialStreak ?? 0;
      return {
        ...initialState,
        phase: 'playing',
        currentWord: words[0].toUpperCase(),
        playableWords: words.slice(1),
        wordIndex: 0,
        wordScores: [],
        streak: initialStreak,
        timerModeEnabled: state.timerModeEnabled,
        hardModeEnabled: state.hardModeEnabled,
        isDailyChallenge: action.isDailyChallenge,
        roundTheme: { ...action.theme, wordList: [...words] },
        roundDate: action.roundDate,
        showLetters: false,
        animationTrigger: state.animationTrigger + 1
      };
    }

    case 'NEXT_WORD': {
      if (state.phase !== 'revealing') return state;
      if (state.playableWords.length === 0) {
        return { ...state, phase: 'complete' };
      }
      const nextWord = state.playableWords[0];
      return {
        ...state,
        phase: 'playing',
        currentWord: nextWord.toUpperCase(),
        playableWords: state.playableWords.slice(1),
        wordIndex: state.wordIndex + 1,
        attempts: 1,
        attemptResults: ['pending', 'pending', 'pending'],
        replayCount: 0,
        replayPenalty: 0,
        lastTimeBonus: 0,
        wordDeadline: state.timerModeEnabled ? action.startedAt + WORD_TIME_MS : null,
        showLetters: true,
        animationTrigger: state.animationTrigger + 1
      };
    }

    case 'START_WORD_TIMER': {
      if (state.phase !== 'playing' || state.wordIndex !== action.wordIndex || state.wordDeadline !== null) {
        return state;
      }
      return {
        ...state,
        wordDeadline: state.timerModeEnabled ? action.startedAt + WORD_TIME_MS : null,
        showLetters: true,
        animationTrigger: state.animationTrigger + 1
      };
    }

    case 'SUBMIT_GUESS': {
      if (state.phase !== 'playing') return state;
      if (state.timerModeEnabled) {
        if (state.wordDeadline === null) return state;
        if (action.submittedAt >= state.wordDeadline) return expireWord(state);
      }
      const guess = action.guess.toUpperCase();
      const isCorrect = guess === state.currentWord;
      const attemptIndex = state.attempts - 1;
      const timeRemaining = state.wordDeadline === null
        ? 0
        : Math.max(0, Math.ceil((state.wordDeadline - action.submittedAt) / 1000));

      const newAttemptResults: [AttemptResult, AttemptResult, AttemptResult] = [...state.attemptResults];
      newAttemptResults[attemptIndex] = isCorrect ? 'correct' : 'wrong';

      if (isCorrect) {
        const { wordScore, newStreak, streakBonusAdded, timeBonus } = calculateWordScore({
          wordLength: state.currentWord.length,
          attempts: state.attempts,
          timerModeEnabled: state.timerModeEnabled,
          timeRemaining,
          streak: state.streak,
          replayCount: state.replayCount,
          hardModeEnabled: state.hardModeEnabled,
          solved: true
        });

        return {
          ...state,
          phase: 'revealing',
          wordDeadline: null,
          attemptResults: newAttemptResults,
          score: state.score + wordScore,
          streak: newStreak,
          streakBonus: state.streakBonus + streakBonusAdded,
          lastTimeBonus: timeBonus,
          wordResults: [...state.wordResults, { attempts: state.attempts, solved: true, usedReplay: state.replayCount > 0 }],
          wordScores: [...state.wordScores, wordScore],
          showLetters: false
        };
      }

      // Wrong guess
      if (state.attempts >= 3) {
        // Failed all attempts
        return {
          ...state,
          phase: 'revealing',
          wordDeadline: null,
          attemptResults: newAttemptResults,
          streak: 0,
          wordResults: [...state.wordResults, { attempts: 4, solved: false, usedReplay: state.replayCount > 0 }],
          wordScores: [...state.wordScores, 0],
          showLetters: false
        };
      }

      // More attempts remaining - will auto-replay after delay
      return {
        ...state,
        attempts: state.attempts + 1,
        attemptResults: newAttemptResults,
        showLetters: false // Set to false first, then App will trigger replay
      };
    }

    case 'REPLAY_WORD': {
      // Each word has 5 total replays in normal mode, 3 in hard mode
      const maxReplays = state.hardModeEnabled ? 3 : 5;
      if (state.replayCount >= maxReplays) return state;

      return {
        ...state,
        replayCount: state.replayCount + 1,
        showLetters: true,
        animationTrigger: state.animationTrigger + 1
      };
    }

    case 'TRIGGER_ANIMATION': {
      return {
        ...state,
        showLetters: true,
        animationTrigger: state.animationTrigger + 1
      };
    }

    case 'TIMER_EXPIRED': {
      if (state.phase !== 'playing' || state.wordDeadline !== action.deadline || action.expiredAt < action.deadline) {
        return state;
      }
      return expireWord(state);
    }

    case 'REVEAL_WORD': {
      return {
        ...state,
        phase: state.playableWords.length === 0 && state.wordIndex === 4 ? 'complete' : 'revealing',
        showLetters: false
      };
    }

    case 'TOGGLE_HARD_MODE': {
      const newHardModeEnabled = !state.hardModeEnabled;
      return {
        ...state,
        hardModeEnabled: newHardModeEnabled,
        // Hard mode controls timer mode
        timerModeEnabled: newHardModeEnabled
      };
    }

    case 'SET_SHOW_LETTERS': {
      return {
        ...state,
        showLetters: action.show
      };
    }

    case 'RESET_GAME': {
      return {
        ...initialState,
        timerModeEnabled: state.timerModeEnabled,
        hardModeEnabled: state.hardModeEnabled
      };
    }

    default:
      return state;
  }
}
