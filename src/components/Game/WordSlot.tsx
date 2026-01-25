interface WordSlotProps {
  index: number;
  score: number | null;
  status: 'pending' | 'active' | 'solved' | 'failed';
}

export function WordSlot({ index, score, status }: WordSlotProps) {
  let wordClass = 'word';
  let displayText = 'Word';

  if (status === 'active') {
    wordClass = 'word at-play';
  } else if (status === 'solved') {
    wordClass = 'word solved';
    displayText = score !== null ? String(score) : 'Word';
  } else if (status === 'failed') {
    wordClass = 'word not-solved';
    displayText = score !== null ? String(score) : 'Word';
  }

  return (
    <div className="word-slot">
      <span className="slot-number">{String(index + 1).padStart(2, '0')}</span>
      <span className={wordClass}>{displayText}</span>
    </div>
  );
}
