import { useRef, useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

export function useAudio() {
  const [muted, setMuted] = useLocalStorage<boolean>('soundMuted', false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isInitializedRef = useRef(false);

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
    return audioContextRef.current;
  }, []);

  const resumeAudioContext = useCallback(() => {
    const context = initAudio();
    if (context) {
      console.log('AudioContext state:', context.state);
      if (context.state === 'suspended') {
        context.resume().then(() => {
          console.log('AudioContext resumed successfully');
        }).catch(err => {
          console.error('Failed to resume audio context:', err);
        });
      } else {
        console.log('AudioContext already running');
      }
    }
    isInitializedRef.current = true;
  }, [initAudio]);

  // Resume audio context on first user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      console.log('User interaction detected, resuming audio context');
      resumeAudioContext();
    };

    // Use capturing phase to catch interactions earlier
    document.addEventListener('touchstart', handleUserInteraction, { once: true, capture: true });
    document.addEventListener('click', handleUserInteraction, { once: true, capture: true });

    return () => {
      document.removeEventListener('touchstart', handleUserInteraction, true);
      document.removeEventListener('click', handleUserInteraction, true);
    };
  }, [resumeAudioContext]);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (muted) return;

    const context = initAudio();
    if (!context) {
      console.warn('Audio context not available');
      return;
    }

    // Ensure context is running (for iOS)
    const resumePromise = context.state === 'suspended' ? context.resume() : Promise.resolve();

    resumePromise.then(() => {
      try {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        // Increased volume for mobile devices (was 0.3, now 0.8)
        gainNode.gain.setValueAtTime(0.8, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);

        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + duration);

        console.log(`Playing tone: ${frequency}Hz for ${duration}s (context state: ${context.state})`);
      } catch (error) {
        console.error('Error playing tone:', error);
      }
    }).catch(err => {
      console.error('Failed to resume audio context:', err);
    });
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
