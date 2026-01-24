import { WordSlot } from './WordSlot';
import type { WordResult } from '../../types/game';

interface ProgressTrackProps {
  currentWordIndex: number;
  wordResults: WordResult[];
  cumulativeScores: number[];
}

export function ProgressTrack({ currentWordIndex, wordResults, cumulativeScores }: ProgressTrackProps) {
  return (
    <div className="progress-track">
      <div className="track-label">WORD PROGRESS</div>
      <div className="word-slots">
        {[0, 1, 2, 3, 4].map((index) => {
          const result = wordResults[index];
          let status: 'pending' | 'active' | 'solved' | 'failed' = 'pending';
          let score: number | null = null;

          if (index < wordResults.length) {
            status = result.solved ? 'solved' : 'failed';
            score = cumulativeScores[index] ?? null;
          } else if (index === currentWordIndex) {
            status = 'active';
          }

          return (
            <WordSlot
              key={index}
              index={index}
              score={score}
              status={status}
            />
          );
        })}
      </div>
    </div>
  );
}
