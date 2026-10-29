interface WordSlotProps {
  index: number;
  score: number | null;
  status: 'pending' | 'active' | 'solved' | 'failed';
  usedReplay?: boolean;
  attempts?: number;
}

export function WordSlot({ index, score, status, usedReplay, attempts }: WordSlotProps) {
  let wordClass = 'word';
  let displayText = 'Word';

  if (status === 'active') {
    wordClass = 'word at-play';
  } else if (status === 'solved') {
    // Yellow if a replay was used or took more than one attempt, green if clean first-try solve
    const isCleanSolve = !usedReplay && (!attempts || attempts === 1);
    wordClass = isCleanSolve ? 'word solved' : 'word solved-later';
    displayText = score !== null ? String(score) : 'Word';
  } else if (status === 'failed') {
    wordClass = 'word not-solved';
    displayText = score !== null ? String(score) : 'Word';
  }

  const outcome = status === 'solved' ? (!usedReplay && (!attempts || attempts === 1) ? 'Clean solve' : 'Assisted solve') :
    status === 'failed' ? 'Not solved' : status === 'active' ? 'Current word' : 'Pending';
  const symbol = status === 'solved' ? (outcome === 'Clean solve' ? '✓' : '≈') : status === 'failed' ? '✗' : status === 'active' ? '▶' : '·';

  return (
    <div className="word-slot" aria-label={`Word ${index + 1}: ${outcome}${score !== null ? `, ${score} points` : ''}`}>
      <span className="slot-number">{String(index + 1).padStart(2, '0')}</span>
      <span className={wordClass} aria-hidden="true"><span>{symbol}</span>{displayText}</span>
    </div>
  );
}
