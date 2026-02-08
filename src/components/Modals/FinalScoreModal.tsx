import { useEffect, useState, useCallback } from 'react';
import { CyberButton } from '../Buttons/CyberButton';
import { generateShareText, copyToClipboard, canUseWebShare, shareViaWeb } from '../../utils/share';
import type { DailyStats, WordResult, HistoryPercentile } from '../../types/game';

interface FinalScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailyNumber: number;
  score: number;
  stats: DailyStats | null;
  percentile: HistoryPercentile;
  wordResults: WordResult[];
  streakBonus: number;
  themeName?: string;
}

export function FinalScoreModal({
  isOpen,
  onClose,
  dailyNumber,
  score,
  stats,
  percentile,
  wordResults,
  streakBonus,
  themeName
}: FinalScoreModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [showPercentile, setShowPercentile] = useState(false);
  const [shareText, setShareText] = useState('SHARE RESULTS');
  const [includeLink, setIncludeLink] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsHiding(false);
      setShowPercentile(false);

      // Trigger percentile animation after delay
      const timeout = setTimeout(() => {
        setShowPercentile(true);
      }, 1000);

      return () => clearTimeout(timeout);
    } else if (isVisible) {
      setIsHiding(true);
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setIsHiding(false);
      }, 250);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, isVisible]);

  const handleShare = useCallback(async () => {
    const highScore = stats?.highScore ?? score;
    const text = generateShareText(dailyNumber, score, wordResults, streakBonus, themeName, includeLink, highScore);
    // const title = `DSCRMBL Daily #${dailyNumber}`;

    // Check if Web Share API is available (mobile devices)
    if (canUseWebShare()) {
      // Mobile - use Web Share API only
      const webShareSuccess = await shareViaWeb(text);
      if (webShareSuccess) {
        setShareText('SHARED!');
        setTimeout(() => setShareText('SHARE RESULTS'), 2000);
      }
      // If user cancelled, don't do anything
    } else {
      // Desktop/laptop - copy to clipboard only
      await copyToClipboard(text);
      setShareText('COPIED!');
      setTimeout(() => setShareText('SHARE RESULTS'), 2000);
    }
  }, [score, wordResults, streakBonus, themeName, dailyNumber, includeLink, stats]);

  if (!isVisible) return null;

  const overlayClass = `modal-overlay ${isHiding ? 'hide-modal' : 'show-modal'}`;
  const percentilePosition = showPercentile ? `${percentile.percentile}%` : '0%';

  return (
    <div id="final-score-modal" className={overlayClass} onClick={onClose}>
      <div className="modal-container modal-container--score" onClick={(e) => e.stopPropagation()}>
        <div className="score-display">
          <div className="score-label" id="modal-title">DAILY #{dailyNumber}</div>
          {themeName && <div className="score-theme">{themeName}</div>}
          <div className="score-value" id="score">{score}</div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">GAMES</span>
            <span className="stat-value" id="gamesPlayed">{stats?.gamesPlayed ?? 1}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">HIGH</span>
            <span className="stat-value" id="highScore">{stats?.highScore ?? score}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">AVG</span>
            <span className="stat-value" id="averageScore">{Math.round(stats?.average ?? score)}</span>
          </div>
        </div>

        <div className="percentile-section">
          <span className="percentile-label">HISTORICAL RANKING</span>
          <div className="percentile-bar">
            <span
              id="percentage-fill"
              className={`percentile-fill ${showPercentile ? 'fill-effect' : ''}`}
              style={{ width: percentilePosition }}
            ></span>
            <span
              id="marker"
              className={`percentile-marker ${showPercentile ? 'marker-animate' : ''}`}
              style={{ left: percentilePosition }}
            ></span>
            <span
              id="marker-text"
              className={`percentile-text ${showPercentile ? 'marker-text-fade-in' : ''}`}
              style={{ left: percentilePosition }}
            >
              {percentile.percentile}%
            </span>
          </div>
        </div>

        <div className="share-options">
          <label className="link-checkbox">
            <input
              type="checkbox"
              checked={includeLink}
              onChange={(e) => setIncludeLink(e.target.checked)}
            />
            <span>Include link to DSCRMBL</span>
          </label>
        </div>

        <CyberButton
          id="share-btn"
          variant="share"
          tag={String.fromCodePoint(0x1F4CB)}
          onClick={handleShare}
        >
          {shareText}
        </CyberButton>
      </div>
    </div>
  );
}
