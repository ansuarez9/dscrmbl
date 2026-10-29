import { useEffect, useState, useCallback, useRef } from 'react';
import { ModalShell } from './ModalShell';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getThemeExplanation } from '../../utils/themeExplanation';
import { CyberButton } from '../Buttons/CyberButton';
import { generateShareText, copyToClipboard, canUseWebShare, shareViaWeb } from '../../utils/share';
import { useAudioContext } from '../../context/AudioContext';
// Monetization disabled — re-enable when ready
// import { trackGameEvent } from '../../utils/analytics';
// import { TIP_JAR_URL } from '../../config/monetization';
import type { DailyStats, WordResult, HistoryPercentile, ThemeExplanation } from '../../types/game';

interface FinalScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailyNumber: number;
  isDailyChallenge: boolean;
  score: number;
  stats: DailyStats | null;
  percentile: HistoryPercentile;
  wordResults: WordResult[];
  wordScores?: number[];
  words?: string[];
  explanation?: ThemeExplanation;
  streakBonus: number;
  themeName?: string;
  isNewHighScore: boolean;
  animateCelebration?: boolean;
}

export function FinalScoreModal({
  isOpen,
  onClose,
  dailyNumber,
  isDailyChallenge,
  score,
  stats,
  percentile,
  wordResults,
  wordScores,
  words,
  explanation,
  streakBonus,
  themeName,
  isNewHighScore,
  animateCelebration = false
}: FinalScoreModalProps) {
  const { playTickSound } = useAudioContext();
  const reducedMotion = useReducedMotion();
  const [showPercentile, setShowPercentile] = useState(false);
  const [shareText, setShareText] = useState('SHARE RESULTS');
  const [includeLink, setIncludeLink] = useState(true);
  const [displayScore, setDisplayScore] = useState(0);
  const [rollUpComplete, setRollUpComplete] = useState(false);
  const rollUpRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickCountRef = useRef(0);
  const explanationRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (isOpen && explanationRef.current) explanationRef.current.open = false;
  }, [isOpen]);

  const completedExplanation = isOpen && wordResults.length === 5 && wordResults.every(result => typeof result?.solved === 'boolean')
    ? getThemeExplanation(explanation, words) : undefined;

  useEffect(() => {
    if (isOpen) {
      setShowPercentile(reducedMotion);
      setRollUpComplete(false);
      tickCountRef.current = 0;

      if (!reducedMotion && animateCelebration && isNewHighScore && score > 0) {
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
    }
  }, [isOpen, isNewHighScore, animateCelebration, score, playTickSound, reducedMotion]);

  const handleShare = useCallback(async () => {
    const highScore = isDailyChallenge ? stats?.highScore ?? score : undefined;
    const text = generateShareText(isDailyChallenge ? dailyNumber : null, score, wordResults, streakBonus, themeName, includeLink, highScore, isNewHighScore, isDailyChallenge ? stats?.currentStreak : undefined);

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
  }, [score, wordResults, streakBonus, themeName, dailyNumber, isDailyChallenge, includeLink, stats, isNewHighScore]);

  const percentilePosition = showPercentile ? `${percentile.percentile}%` : '0%';
  const modalContainerClass = `modal-container modal-container--score${isNewHighScore ? ' modal-container--highscore' : ''}`;

  return (
    <ModalShell id="final-score-modal" isOpen={isOpen} onClose={onClose} labelledBy="modal-title" describedBy="score-summary"
      className={modalContainerClass.replace('modal-container ', '')} dismissOnBackdrop>
        <button type="button" className="results-close" onClick={onClose}>Close results</button>
        <div className="score-display">
          <div className="score-label" id="modal-title">{isDailyChallenge ? `DAILY #${dailyNumber}` : 'PRACTICE ROUND'}</div>
          {themeName && <div className="score-theme">{themeName}</div>}

          {isNewHighScore && (
            <div className="high-score-banner">NEW HIGH SCORE!</div>
          )}

          <div className={`score-value${isNewHighScore && rollUpComplete ? ' score-glow-pulse' : ''}`} id="score" aria-hidden="true">
            {displayScore}
          </div>
          <span id="score-summary" className="sr-only">Final score: {score}</span>
        </div>

        {isDailyChallenge && <div className="stats-grid">
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
        </div>}

        {words && words.length > 0 && (
          <div className="word-results-section">
            <span className="word-results-label">{isDailyChallenge ? 'DAILY WORDS' : 'PRACTICE WORDS'}</span>
            <div className="word-results-list">
              {words.map((word, i) => {
                const result = wordResults[i];
                const pts = wordScores?.[i] ?? null;

                let statusClass = 'word-result-row--pending';
                let statusChar = '—';
                if (result) {
                  if (result.solved && !result.usedReplay && result.attempts === 1) {
                    statusClass = 'word-result-row--green';
                    statusChar = '✓ Clean';
                  } else if (result.solved) {
                    statusClass = 'word-result-row--yellow';
                    statusChar = '✓ Assisted';
                  } else {
                    statusClass = 'word-result-row--red';
                    statusChar = '✗ Missed';
                  }
                }

                return (
                  <div key={i} className={`word-result-row ${statusClass}`}>
                    <span className="word-result-index">{String(i + 1).padStart(2, '0')}</span>
                    <span className="word-result-indicator">{statusChar}</span>
                    <span className="word-result-word">{word.toUpperCase()}</span>
                    {pts !== null && (
                      <span className="word-result-score">+{pts}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isDailyChallenge && <div className="percentile-section">
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
        </div>}

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

        <p className="sr-only" role="status">{shareText === 'SHARE RESULTS' ? '' : shareText}</p>
        <CyberButton
          id="share-btn"
          variant="share"
          tag={String.fromCodePoint(0x1F4CB)}
          onClick={handleShare}
        >
          {shareText}
        </CyberButton>

        {completedExplanation && words && (
          <details className="theme-explanation" ref={explanationRef}>
            <summary>How the words connect</summary>
            <p>{completedExplanation.summary}</p>
            <ul>
              {words.map(word => (
                <li key={word}>
                  <strong>{word.toUpperCase()}</strong>
                  {completedExplanation.wordNotes?.[word] && <span>{completedExplanation.wordNotes[word]}</span>}
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* Monetization disabled — re-enable when ready
        <a
          className="tip-jar-link"
          href={TIP_JAR_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackGameEvent.tipJarClick('final_score')}
        >
          Enjoying DSCRMBL? <span className="tip-jar-link-cta">Buy us a coffee {String.fromCodePoint(0x2615)}</span>
        </a>
        */}
    </ModalShell>
  );
}
