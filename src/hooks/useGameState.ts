import { useReducer, useCallback, useEffect } from 'react';
import type { GameState, GameAction, AttemptResult, SavedGameState } from '../types/game';
import { calculateWordScore } from '../utils/scoring';

const STORAGE_KEY = 'dscrmbl-game-state';
const HARD_MODE_KEY = 'dscrmbl-hard-mode-preference';
const WORD_TIME_MS = 20_000;

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
  lastTimeBonus: 0,
  wordDeadline: null,
  timerModeEnabled: false,
  hardModeEnabled: false,
  isDailyChallenge: true,
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
        hardModeEnabled: state.hardModeEnabled,
        isDailyChallenge: true,
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

function loadHardModePreference(): boolean {
  try {
    const saved = localStorage.getItem(HARD_MODE_KEY);
    return saved === 'true';
  } catch {
    return false;
  }
}

function saveHardModePreference(enabled: boolean): void {
  try {
    localStorage.setItem(HARD_MODE_KEY, enabled.toString());
  } catch {
    // Ignore storage errors
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
      const savedState = parsed.state;
      const hasDeadline = typeof savedState.wordDeadline === 'number' && Number.isFinite(savedState.wordDeadline);
      // Older saves cannot tell us how long the word has been active. Give later words
      // one fresh window; the first word restarts its pre-timer countdown.
      const wordDeadline = savedState.timerModeEnabled && savedState.phase === 'playing'
        ? hasDeadline ? savedState.wordDeadline : savedState.wordIndex > 0 ? Date.now() + WORD_TIME_MS : null
        : null;
      return {
        ...savedState,
        wordDeadline,
        // A refresh must not grant another free look at an active word.
        // The pending first-word countdown starts its own animation when it ends.
        showLetters: false
      };
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
  const [state, dispatch] = useReducer(gameReducer, undefined, () => {
    const hardModePreference = loadHardModePreference();
    return loadSavedState() ?? {
      ...initialState,
      hardModeEnabled: hardModePreference,
      timerModeEnabled: hardModePreference
    };
  });

  // The initial state is already restored before this effect can save it.
  useEffect(() => {
    saveState(state);
  }, [state]);

  const startGame = useCallback((words: string[], initialStreak?: number) => {
    dispatch({ type: 'START_GAME', words, initialStreak });
  }, []);

  const nextWord = useCallback(() => {
    dispatch({ type: 'NEXT_WORD', startedAt: Date.now() });
  }, []);

  const startWordTimer = useCallback((wordIndex: number) => {
    dispatch({ type: 'START_WORD_TIMER', wordIndex, startedAt: Date.now() });
  }, []);

  const submitGuess = useCallback((guess: string, submittedAt: number) => {
    dispatch({ type: 'SUBMIT_GUESS', guess, submittedAt });
  }, []);

  const replayWord = useCallback(() => {
    dispatch({ type: 'REPLAY_WORD' });
  }, []);

  const timerExpired = useCallback((deadline: number) => {
    dispatch({ type: 'TIMER_EXPIRED', deadline, expiredAt: Date.now() });
  }, []);

  const toggleHardMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_HARD_MODE' });
  }, []);

  // Persist hard mode preference whenever it changes
  useEffect(() => {
    saveHardModePreference(state.hardModeEnabled);
  }, [state.hardModeEnabled]);

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
    startWordTimer,
    submitGuess,
    replayWord,
    timerExpired,
    toggleHardMode,
    setShowLetters,
    resetGame,
    triggerAnimation
  };
}
