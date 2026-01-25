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
    <div id={`attempt-container-${index + 1}`} className={containerClass}>
      <div className="orb-inner">
        <span className="attempt">?</span>
        <span id={`result-${index + 1}`} className={resultClass}></span>
      </div>
      <div className="orb-ring"></div>
    </div>
  );
}
