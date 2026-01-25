import { useRef, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export function useAudio() {
  const [muted, setMuted] = useLocalStorage<boolean>('soundMuted', false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (muted) return;

    const context = initAudio();
    if (!context) return;

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.3, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + duration);
  }, [muted, initAudio]);

  const playCorrectSound = useCallback(() => {
    if (muted) return;
    // Ascending happy tone
    playTone(523.25, 0.15); // C5
    setTimeout(() => playTone(659.25, 0.15), 100); // E5
    setTimeout(() => playTone(783.99, 0.2), 200); // G5
  }, [muted, playTone]);

  const playWrongSound = useCallback(() => {
    if (muted) return;
    // Descending sad tone
    playTone(392, 0.15); // G4
    setTimeout(() => playTone(349.23, 0.2), 150); // F4
  }, [muted, playTone]);

  const playVictorySound = useCallback(() => {
    if (muted) return;
    // Victory fanfare
    playTone(523.25, 0.1); // C5
    setTimeout(() => playTone(659.25, 0.1), 100); // E5
    setTimeout(() => playTone(783.99, 0.1), 200); // G5
    setTimeout(() => playTone(1046.5, 0.3), 300); // C6
  }, [muted, playTone]);

  const playTimerWarningSound = useCallback(() => {
    if (muted) return;
    playTone(880, 0.1); // A5 short beep
  }, [muted, playTone]);

  const toggleMute = useCallback(() => {
    setMuted(prev => !prev);
  }, [setMuted]);

  return {
    muted,
    toggleMute,
    playCorrectSound,
    playWrongSound,
    playVictorySound,
    playTimerWarningSound
  };
}
