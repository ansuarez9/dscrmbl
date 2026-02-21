import { createContext, useContext, type ReactNode } from 'react';
import { useGameState } from '../hooks/useGameState';
import type { GameState } from '../types/game';

interface GameContextType {
  state: GameState;
  startGame: (words: string[], initialStreak?: number) => void;
  nextWord: () => void;
  submitGuess: (guess: string, timeRemaining?: number) => void;
  replayWord: () => void;
  timerExpired: () => void;
  toggleHardMode: () => void;
  setShowLetters: (show: boolean) => void;
  resetGame: () => void;
  triggerAnimation: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const gameState = useGameState();

  return (
    <GameContext.Provider value={gameState}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}
