import { useRef, useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

export function useAudio() {
  const [muted, setMuted] = useLocalStorage<boolean>('soundMuted', false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isUnlockedRef = useRef(false);

  // Get or create AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
    return audioContextRef.current;
  }, []);

  // Unlock audio for iOS - must happen during user gesture
  const unlockAudio = useCallback(() => {
    if (isUnlockedRef.current) return;

    try {
      const context = getAudioContext();

      // Create silent buffer using context's native sample rate
      const buffer = context.createBuffer(1, 1, context.sampleRate);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start(0);

      // Resume if needed
      if (context.state === 'suspended') {
        context.resume();
      }

      isUnlockedRef.current = true;
    } catch (e) {
      console.error('Audio unlock failed:', e);
    }
  }, [getAudioContext]);

  // Set up unlock on user interaction
  useEffect(() => {
    const handleInteraction = () => {
      unlockAudio();
    };

    // Listen on both capture and bubble phase for maximum compatibility
    const options = { passive: true };

    document.addEventListener('touchstart', handleInteraction, options);
    document.addEventListener('touchend', handleInteraction, options);
    document.addEventListener('click', handleInteraction, options);
    document.addEventListener('keydown', handleInteraction, options);

    return () => {
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('touchend', handleInteraction);
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [unlockAudio]);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (muted) return;

    try {
      const context = getAudioContext();

      // Always try to resume
      if (context.state === 'suspended') {
        context.resume();
      }

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      const now = context.currentTime;
      // Use higher gain for mobile
      gainNode.gain.setValueAtTime(0.7, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (error) {
      console.error('Error playing tone:', error);
    }
  }, [muted, getAudioContext]);

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
