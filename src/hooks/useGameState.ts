import { useReducer, useCallback, useEffect } from 'react';
import type { GameState, SavedGameState, DailyTheme } from '../types/game';
import { gameReducer, initialState, WORD_TIME_MS } from '../utils/gameEngine';
import { storedDateKey } from '../utils/localDate';

const STORAGE_KEY = 'dscrmbl-game-state';
const HARD_MODE_KEY = 'dscrmbl-hard-mode-preference';
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
    if (parsed.state.phase === 'complete' && parsed.state.isDailyChallenge) {
      try {
        const daily = JSON.parse(localStorage.getItem('dscrmbl-daily') || 'null');
        if (storedDateKey(daily?.lastPlayed) === parsed.state.roundDate || daily?.progress?.records?.[parsed.state.roundDate ?? '']) {
          localStorage.removeItem(STORAGE_KEY);
          return null;
        }
      } catch { /* Keep the pending completion if daily statistics cannot be read. */ }
    }
    // Active rounds remain available after midnight, including across refresh.
    if (parsed.state.phase !== 'idle' && (parsed.state.phase !== 'complete' || parsed.state.isDailyChallenge === true)) {
      const savedState = parsed.state;
      const hasDeadline = typeof savedState.wordDeadline === 'number' && Number.isFinite(savedState.wordDeadline);
      // Older saves cannot tell us how long the word has been active. Give later words
      // one fresh window; the first word restarts its pre-timer countdown.
      const wordDeadline = savedState.timerModeEnabled && savedState.phase === 'playing'
        ? hasDeadline ? savedState.wordDeadline : savedState.wordIndex > 0 ? Date.now() + WORD_TIME_MS : null
        : null;
      return {
        ...savedState,
        // Saves made before round metadata existed were daily games.
        isDailyChallenge: savedState.isDailyChallenge ?? true,
        roundTheme: savedState.roundTheme ?? null,
        roundDate: savedState.roundDate ?? (savedState.isDailyChallenge === false ? null : storedDateKey(parsed.savedDate)),
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
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be blocked. */ }
    return null;
  }
}

function saveState(state: GameState): void {
  try {
    if (state.phase === 'complete' && state.isDailyChallenge) {
      const daily = JSON.parse(localStorage.getItem('dscrmbl-daily') || 'null');
      if (storedDateKey(daily?.lastPlayed) === state.roundDate || daily?.progress?.records?.[state.roundDate ?? '']) {
        acknowledgeDailyCompletion(state.roundDate!);
        return;
      }
    }
    // Completed daily state stays recoverable until its statistics have been committed.
    if (state.phase === 'idle' || (state.phase === 'complete' && !state.isDailyChallenge)) {
      // Keep an unsaved daily completion even if its session results have been closed.
      const pending = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as SavedGameState | null;
      if (pending?.state.phase === 'complete' && pending.state.isDailyChallenge) return;
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const saveData: SavedGameState = {
      state,
      savedDate: state.roundDate ?? new Date().toDateString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
  } catch {
    // Ignore storage errors
  }
}

export function acknowledgeDailyCompletion(challengeDate: string) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as SavedGameState | null;
    if (saved?.state.phase === 'complete' && saved.state.roundDate === challengeDate) localStorage.removeItem(STORAGE_KEY);
  } catch { /* A duplicate completion will be reconciled on the next restoration. */ }
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

  const startGame = useCallback((theme: DailyTheme, isDailyChallenge: boolean, initialStreak?: number, roundDate: string | null = null) => {
    dispatch({ type: 'START_GAME', theme, isDailyChallenge, initialStreak, roundDate });
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
