import { useEffect, useState, useCallback, useRef } from 'react';
import { CyberButton } from '../Buttons/CyberButton';
import { generateShareText, copyToClipboard, canUseWebShare, shareViaWeb } from '../../utils/share';
import { useAudioContext } from '../../context/AudioContext';
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
  isNewHighScore: boolean;
  animateCelebration?: boolean;
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
  themeName,
  isNewHighScore,
  animateCelebration = false
}: FinalScoreModalProps) {
  const { playTickSound } = useAudioContext();
  const [isVisible, setIsVisible] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [showPercentile, setShowPercentile] = useState(false);
  const [shareText, setShareText] = useState('SHARE RESULTS');
  const [includeLink, setIncludeLink] = useState(true);
  const [displayScore, setDisplayScore] = useState(0);
  const [rollUpComplete, setRollUpComplete] = useState(false);
  const rollUpRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickCountRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsHiding(false);
      setShowPercentile(false);
      setRollUpComplete(false);
      tickCountRef.current = 0;

      if (animateCelebration && isNewHighScore && score > 0) {
        // Start score roll-up
        setDisplayScore(0);
        const totalSteps = 60;
        const intervalMs = 1500 / totalSteps;
        let step = 0;

        rollUpRef.current = setInterval(() => {
          step++;
          const progress = step / totalSteps;
          const easedProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
          setDisplayScore(Math.round(easedProgress * score));

          // Play tick every 3rd step
          if (step % 3 === 0) {
            tickCountRef.current++;
            playTickSound();
          }

          if (step >= totalSteps) {
            if (rollUpRef.current) clearInterval(rollUpRef.current);
            setDisplayScore(score);
            setRollUpComplete(true);
          }
        }, intervalMs);
      } else {
        setDisplayScore(score);
        setRollUpComplete(true);
      }

      // Trigger percentile animation after delay
      const timeout = setTimeout(() => {
        setShowPercentile(true);
      }, isNewHighScore ? 2000 : 1000);

      return () => {
        clearTimeout(timeout);
        if (rollUpRef.current) clearInterval(rollUpRef.current);
      };
    } else if (isVisible) {
      setIsHiding(true);
      if (rollUpRef.current) clearInterval(rollUpRef.current);
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setIsHiding(false);
      }, 250);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, isVisible, isNewHighScore, animateCelebration, score, playTickSound]);

  const handleShare = useCallback(async () => {
    const highScore = stats?.highScore ?? score;
    const text = generateShareText(dailyNumber, score, wordResults, streakBonus, themeName, includeLink, highScore, isNewHighScore);

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
  }, [score, wordResults, streakBonus, themeName, dailyNumber, includeLink, stats, isNewHighScore]);

  if (!isVisible) return null;

  const overlayClass = `modal-overlay ${isHiding ? 'hide-modal' : 'show-modal'}`;
  const percentilePosition = showPercentile ? `${percentile.percentile}%` : '0%';
  const modalContainerClass = `modal-container modal-container--score${isNewHighScore ? ' modal-container--highscore' : ''}`;

  return (
    <div id="final-score-modal" className={overlayClass} onClick={onClose}>
      <div className={modalContainerClass} onClick={(e) => e.stopPropagation()}>
        <div className="score-display">
          <div className="score-label" id="modal-title">DAILY #{dailyNumber}</div>
          {themeName && <div className="score-theme">{themeName}</div>}

          {isNewHighScore && (
            <div className="high-score-banner">NEW HIGH SCORE!</div>
          )}

          <div className={`score-value${isNewHighScore && rollUpComplete ? ' score-glow-pulse' : ''}`} id="score">
            {displayScore}
          </div>
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
              className={`percentile-fill ${showPercentile ? 'fill-effect' : ''}${isNewHighScore ? ' percentile-fill--highscore' : ''}`}
              style={{ width: percentilePosition }}
            ></span>
            <span
              id="marker"
              className={`percentile-marker ${showPercentile ? 'marker-animate' : ''}${isNewHighScore ? ' percentile-marker--highscore' : ''}`}
              style={{ left: percentilePosition }}
            ></span>
            <span
              id="marker-text"
              className={`percentile-text ${showPercentile ? 'marker-text-fade-in' : ''}${isNewHighScore ? ' percentile-text--highscore' : ''}`}
              style={{ left: percentilePosition }}
            >
              {isNewHighScore ? 'BEST EVER' : `${percentile.percentile}%`}
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
