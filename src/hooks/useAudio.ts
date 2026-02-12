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

  const playHighScoreJingle = useCallback(() => {
    if (muted) return;

    try {
      const context = getAudioContext();
      if (context.state === 'suspended') {
        context.resume();
      }

      const now = context.currentTime;

      // Ascending 6-note arpeggio: C5→E5→G5→C6→E6→G6
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
      const noteSpacing = 0.12;

      notes.forEach((freq, i) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.connect(gain);
        gain.connect(context.destination);
        osc.frequency.value = freq;
        osc.type = 'square';
        const t = now + i * noteSpacing;
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
      });

      // Sustained C-major chord after arpeggio
      const chordStart = now + notes.length * noteSpacing + 0.05;
      const chordFreqs = [523.25, 659.25, 783.99];
      chordFreqs.forEach((freq) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.connect(gain);
        gain.connect(context.destination);
        osc.frequency.value = freq;
        osc.type = 'square';
        gain.gain.setValueAtTime(0.2, chordStart);
        gain.gain.exponentialRampToValueAtTime(0.001, chordStart + 0.6);
        osc.start(chordStart);
        osc.stop(chordStart + 0.6);
      });
    } catch (error) {
      console.error('Error playing high score jingle:', error);
    }
  }, [muted, getAudioContext]);

  const playTickSound = useCallback(() => {
    if (muted) return;
    playTone(1200, 0.03, 'square');
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
    playTimerWarningSound,
    playHighScoreJingle,
    playTickSound
  };
}
