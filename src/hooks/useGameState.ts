import { useReducer, useCallback, useEffect } from 'react';
import type { GameState, GameAction, AttemptResult, SavedGameState } from '../types/game';
import { calculateWordScore } from '../utils/scoring';

const STORAGE_KEY = 'dscrmbl-game-state';

const initialState: GameState = {
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
  timeRemaining: 30,
  timerModeEnabled: false,
  isDailyChallenge: true,
  showLetters: false,
  animationTrigger: 0
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const words = action.words;
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
        isDailyChallenge: true,
        showLetters: false,
        animationTrigger: state.animationTrigger + 1
      };
    }

    case 'NEXT_WORD': {
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
        timeRemaining: 30,
        showLetters: true,
        animationTrigger: state.animationTrigger + 1
      };
    }

    case 'SUBMIT_GUESS': {
      const guess = action.guess.toUpperCase();
      const isCorrect = guess === state.currentWord;
      const attemptIndex = state.attempts - 1;

      const newAttemptResults: [AttemptResult, AttemptResult, AttemptResult] = [...state.attemptResults];
      newAttemptResults[attemptIndex] = isCorrect ? 'correct' : 'wrong';

      if (isCorrect) {
        const { wordScore, newStreak, streakBonusAdded } = calculateWordScore({
          wordLength: state.currentWord.length,
          attempts: state.attempts,
          timerModeEnabled: state.timerModeEnabled,
          timeRemaining: state.timeRemaining,
          streak: state.streak,
          replayCount: state.replayCount,
          solved: true
        });

        return {
          ...state,
          phase: 'revealing',
          attemptResults: newAttemptResults,
          score: state.score + wordScore,
          streak: newStreak,
          streakBonus: state.streakBonus + streakBonusAdded,
          wordResults: [...state.wordResults, { attempts: state.attempts, solved: true }],
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
          attemptResults: newAttemptResults,
          streak: 0,
          wordResults: [...state.wordResults, { attempts: 4, solved: false }],
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
      // Each word has 5 total replays available
      if (state.replayCount >= 5) return state;

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

    case 'TIMER_TICK': {
      return {
        ...state,
        timeRemaining: Math.max(0, state.timeRemaining - 1)
      };
    }

    case 'TIMER_EXPIRED': {
      const attemptIndex = state.attempts - 1;
      const newAttemptResults: [AttemptResult, AttemptResult, AttemptResult] = [...state.attemptResults];
      newAttemptResults[attemptIndex] = 'wrong';

      return {
        ...state,
        phase: 'revealing',
        attemptResults: newAttemptResults,
        streak: 0,
        wordResults: [...state.wordResults, { attempts: 4, solved: false }],
        wordScores: [...state.wordScores, 0],
        showLetters: false
      };
    }

    case 'REVEAL_WORD': {
      return {
        ...state,
        phase: state.playableWords.length === 0 && state.wordIndex === 4 ? 'complete' : 'revealing',
        showLetters: false
      };
    }

    case 'TOGGLE_TIMER_MODE': {
      return {
        ...state,
        timerModeEnabled: !state.timerModeEnabled
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
        timerModeEnabled: state.timerModeEnabled
      };
    }

    case 'RESTORE_STATE': {
      return {
        ...action.state,
        // Reset animation-related state for a fresh start
        showLetters: action.state.phase === 'playing',
        animationTrigger: action.state.animationTrigger + 1
      };
    }

    default:
      return state;
  }
}

function loadSavedState(): GameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const parsed: SavedGameState = JSON.parse(saved);
    const today = new Date().toDateString();

    // Only restore if saved today and game is in progress
    if (parsed.savedDate === today && parsed.state.phase !== 'idle' && parsed.state.phase !== 'complete') {
      return parsed.state;
    }

    // Clear stale saved state
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function saveState(state: GameState): void {
  try {
    // Only save if game is in progress
    if (state.phase === 'idle' || state.phase === 'complete') {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const saveData: SavedGameState = {
      state,
      savedDate: new Date().toDateString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
  } catch {
    // Ignore storage errors
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Load saved state on mount
  useEffect(() => {
    const savedState = loadSavedState();
    if (savedState) {
      dispatch({ type: 'RESTORE_STATE', state: savedState });
    }
  }, []);

  // Save state whenever it changes (but not on initial mount)
  useEffect(() => {
    saveState(state);
  }, [state]);

  const startGame = useCallback((words: string[], initialStreak?: number) => {
    dispatch({ type: 'START_GAME', words, initialStreak });
  }, []);

  const nextWord = useCallback(() => {
    dispatch({ type: 'NEXT_WORD' });
  }, []);

  const submitGuess = useCallback((guess: string) => {
    dispatch({ type: 'SUBMIT_GUESS', guess });
  }, []);

  const replayWord = useCallback(() => {
    dispatch({ type: 'REPLAY_WORD' });
  }, []);

  const timerExpired = useCallback(() => {
    dispatch({ type: 'TIMER_EXPIRED' });
  }, []);

  const toggleTimerMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_TIMER_MODE' });
  }, []);

  const setShowLetters = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_LETTERS', show });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
  }, []);

  const triggerAnimation = useCallback(() => {
    dispatch({ type: 'TRIGGER_ANIMATION' });
  }, []);

  return {
    state,
    startGame,
    nextWord,
    submitGuess,
    replayWord,
    timerExpired,
    toggleTimerMode,
    setShowLetters,
    resetGame,
    triggerAnimation
  };
}
