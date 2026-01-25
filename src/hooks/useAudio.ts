import { useRef, useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

export function useAudio() {
  const [muted, setMuted] = useLocalStorage<boolean>('soundMuted', false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isUnlockedRef = useRef(false);

  // Initialize and unlock audio context for iOS
  const unlockAudioContext = useCallback(() => {
    if (isUnlockedRef.current) return;

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const context = audioContextRef.current;

      // iOS unlock pattern: create and play a silent buffer
      const buffer = context.createBuffer(1, 1, 22050);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start(0);

      // Resume if suspended
      if (context.state === 'suspended') {
        context.resume();
      }

      isUnlockedRef.current = true;
      console.log('Audio unlocked successfully');
    } catch (error) {
      console.error('Failed to unlock audio:', error);
    }
  }, []);

  // Set up unlock listeners
  useEffect(() => {
    const events = ['touchstart', 'touchend', 'mousedown', 'keydown'];

    const unlock = () => {
      unlockAudioContext();
      // Remove listeners after first unlock
      events.forEach(event => {
        document.removeEventListener(event, unlock);
      });
    };

    events.forEach(event => {
      document.addEventListener(event, unlock, { once: true, passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, unlock);
      });
    };
  }, [unlockAudioContext]);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (muted) return;

    const context = audioContextRef.current;
    if (!context) {
      console.warn('Audio context not available');
      return;
    }

    // Ensure context is running
    if (context.state === 'suspended') {
      context.resume();
    }

    try {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      const now = context.currentTime;
      gainNode.gain.setValueAtTime(0.5, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (error) {
      console.error('Error playing tone:', error);
    }
  }, [muted]);

  const playCorrectSound = useCallback(() => {
    if (muted) return;
    playTone(523.25, 0.15);
    setTimeout(() => playTone(659.25, 0.15), 100);
    setTimeout(() => playTone(783.99, 0.2), 200);
  }, [muted, playTone]);

  const playWrongSound = useCallback(() => {
    if (muted) return;
    playTone(392, 0.15);
    setTimeout(() => playTone(349.23, 0.2), 150);
  }, [muted, playTone]);

  const playVictorySound = useCallback(() => {
    if (muted) return;
    playTone(523.25, 0.1);
    setTimeout(() => playTone(659.25, 0.1), 100);
    setTimeout(() => playTone(783.99, 0.1), 200);
    setTimeout(() => playTone(1046.5, 0.3), 300);
  }, [muted, playTone]);

  const playTimerWarningSound = useCallback(() => {
    if (muted) return;
    playTone(880, 0.1);
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
