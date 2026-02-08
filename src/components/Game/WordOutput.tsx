import { useEffect, useState, useRef, useCallback } from 'react';

interface WordOutputProps {
  word: string;
  isRevealed: boolean;
  showLetters: boolean;
  animationTrigger: number;
  onAnimationComplete?: () => void;
  startCountdown?: 'ready' | 'set' | 'go' | null;
}

interface LetterState {
  char: string;
  animationKey: number; // Used to re-trigger animation
}

function randomTimeout(): number {
  return Math.floor(Math.random() * 1500);
}

export function WordOutput({ word, isRevealed, showLetters, animationTrigger, onAnimationComplete, startCountdown }: WordOutputProps) {
  const [letters, setLetters] = useState<LetterState[]>([]);
  const [animatedIndices, setAnimatedIndices] = useState<Set<number>>(new Set());
  const animationCompleteRef = useRef(false);
  const timeoutsRef = useRef<number[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  useEffect(() => {
    if (!word) {
      setLetters([]);
      setAnimatedIndices(new Set());
      return;
    }

    if (isRevealed) {
      // Show word immediately when revealed - no animation needed
      clearTimeouts();
      setLetters(word.split('').map((char, i) => ({ char, animationKey: i })));
      setAnimatedIndices(new Set());
      return;
    }

    if (showLetters) {
      // Reset animation state
      clearTimeouts();
      animationCompleteRef.current = false;

      // Initialize letters
      const newLetters = word.split('').map((char, i) => ({ char, animationKey: Date.now() + i }));
      setLetters(newLetters);
      setAnimatedIndices(new Set());

      // Trigger random fade-in effect for each letter
      const completedAnimations = new Set<number>();

      newLetters.forEach((_, index) => {
        const timeout = window.setTimeout(() => {
          setAnimatedIndices(prev => {
            const newSet = new Set(prev);
            newSet.add(index);
            return newSet;
          });

          completedAnimations.add(index);

          // Check if all letters have been animated
          if (completedAnimations.size === newLetters.length && !animationCompleteRef.current) {
            animationCompleteRef.current = true;
            // Wait for the last animation to complete (500ms) before callback
            setTimeout(() => onAnimationComplete?.(), 600);
          }
        }, randomTimeout());
        timeoutsRef.current.push(timeout);
      });
    }

    return () => {
      clearTimeouts();
    };
  }, [word, isRevealed, showLetters, animationTrigger, onAnimationComplete, clearTimeouts]);

  const letterHint = word ? `${Array(word.length).fill('_').join(' ')} (${word.length} letters)` : '';

  if (isRevealed) {
    return (
      <div className="game-display">
        <div className="display-screen">
          <div className="screen-border"></div>
          <div id="typewritter-output" className="word-output fade-in-result">
            {word}
          </div>
          <div id="letter-count" className="letter-hint">({word.length} letters)</div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-display">
      <div className="display-screen">
        <div className="screen-border"></div>
        {startCountdown ? (
          <div key={startCountdown} className="countdown-text">
            {startCountdown.toUpperCase()}
          </div>
        ) : (
          <>
            <div id="typewritter-output" className="word-output">
              {letters.map((letter, index) => (
                <span
                  key={`${letter.animationKey}-${index}`}
                  className={animatedIndices.has(index) ? 'hidden-output fade-in-output' : 'hidden-output'}
                >
                  {letter.char}
                </span>
              ))}
            </div>
            {word && <div id="letter-count" className="letter-hint">{letterHint}</div>}
          </>
        )}
      </div>
    </div>
  );
}
