import type { AttemptResult } from '../../types/game';

interface AttemptOrbProps {
  index: number;
  result: AttemptResult;
  isFlipped: boolean;
}

export function AttemptOrb({ index, result, isFlipped }: AttemptOrbProps) {
  const containerClass = isFlipped ? 'attempt-orb rotate-attempt' : 'attempt-orb';
  const resultClass = result === 'pending' ? 'result' : `result ${result}`;

  return (
    <div id={`attempt-container-${index + 1}`} className={containerClass}
      role="img" aria-label={`Attempt ${index + 1}: ${result === 'pending' ? 'unused' : result === 'correct' ? 'correct' : 'incorrect'}`}>
      <div className="orb-inner" aria-hidden="true">
        <span className="attempt">?</span>
        <span id={`result-${index + 1}`} className={resultClass}>{result === 'correct' ? '✓' : result === 'wrong' ? '✗' : ''}</span>
      </div>
      <div className="orb-ring"></div>
    </div>
  );
}
