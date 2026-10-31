import type { DailyStats } from '../../types/game';
import { ModalShell } from './ModalShell';
import { LifetimeSummary, YourProgress } from '../Statistics/PersonalStatistics';

export function StatsModal({ isOpen, onClose, stats, currentStreak, storageWarning }: {
  isOpen: boolean; onClose: () => void; stats: DailyStats | null; currentStreak: number; storageWarning: string | null;
}) {
  return <ModalShell id="stats-modal" isOpen={isOpen} onClose={onClose} labelledBy="stats-title" dismissOnBackdrop>
    <div className="modal-header">
      <h2 id="stats-title" className="modal-title">Your Stats</h2>
      <button type="button" className="modal-close-btn" aria-label="Close statistics" onClick={onClose}>✕</button>
    </div>
    <div className="modal-content">
      <LifetimeSummary stats={stats} currentStreak={currentStreak} />
      {storageWarning && <p role="status">{storageWarning}</p>}
      <YourProgress stats={stats} isOpen={isOpen} />
    </div>
  </ModalShell>;
}
