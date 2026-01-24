import { AttemptOrb } from './AttemptOrb';
import type { AttemptResult } from '../../types/game';

interface AttemptsDisplayProps {
  results: [AttemptResult, AttemptResult, AttemptResult];
  currentAttempt: number;
}

export function AttemptsDisplay({ results, currentAttempt }: AttemptsDisplayProps) {
  return (
    <div className="attempts-display">
      {results.map((result, index) => (
        <AttemptOrb
          key={index}
          index={index}
          result={result}
          isFlipped={result !== 'pending' || index < currentAttempt - 1}
        />
      ))}
    </div>
  );
}
