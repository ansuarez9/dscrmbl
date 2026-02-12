import { createContext, useContext, type ReactNode } from 'react';
import { useAudio } from '../hooks/useAudio';

interface AudioContextType {
  muted: boolean;
  toggleMute: () => void;
  playCorrectSound: () => void;
  playWrongSound: () => void;
  playVictorySound: () => void;
  playTimerWarningSound: () => void;
  playHighScoreJingle: () => void;
  playTickSound: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const audio = useAudio();

  return (
    <AudioContext.Provider value={audio}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudioContext() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioContext must be used within an AudioProvider');
  }
  return context;
}
