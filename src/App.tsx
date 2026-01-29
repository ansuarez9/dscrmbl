import { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AudioProvider, useAudioContext } from './context/AudioContext';
import { GameProvider, useGameContext } from './context/GameContext';
import { GameContainer } from './components/Layout/GameContainer';
import { Header } from './components/Layout/Header';
import { SettingsPanel } from './components/Layout/SettingsPanel';
import { StatusBar } from './components/Layout/StatusBar';
import { CyberButton } from './components/Buttons/CyberButton';
import { AttemptsDisplay } from './components/Game/AttemptsDisplay';
import { WordOutput } from './components/Game/WordOutput';
import { InputZone } from './components/Game/InputZone';
import { ProgressTrack } from './components/Game/ProgressTrack';
import { InstructionsModal } from './components/Modals/InstructionsModal';
import { FinalScoreModal } from './components/Modals/FinalScoreModal';
import { useDailyChallenge } from './hooks/useDailyChallenge';
import { useDailyTheme } from './hooks/useDailyTheme';
import { useTimer } from './hooks/useTimer';
import { calculateFinalScore } from './utils/scoring';
import { getTimeUntilNextDay } from './utils/seededRandom';
import type { DailyStats, HistoryPercentile } from './types/game';

function GameContent() {
  const { state, startGame, nextWord, submitGuess, replayWord, timerExpired, toggleTimerMode, resetGame, setShowLetters } = useGameContext();
  const { playCorrectSound, playWrongSound, playVictorySound, playTimerWarningSound } = useAudioContext();
  const { dailyNumber, canPlayToday, todayScore, todayResults, dailyStats, updateDailyStats, getCurrentStreak, updateStreak } = useDailyChallenge();
  const { theme, isLoading: isThemeLoading, error: themeError } = useDailyTheme();

  const [showInstructions, setShowInstructions] = useState(false);
  const [showFinalScore, setShowFinalScore] = useState(false);
  const [finalStats, setFinalStats] = useState<DailyStats | null>(null);
  const [finalPercentile, setFinalPercentile] = useState<HistoryPercentile>({ history: [], percentile: 100 });
  const [countdown, setCountdown] = useState('--:--:--');
  const [gameCompleteHandled, setGameCompleteHandled] = useState(false);
  const [startCountdown, setStartCountdown] = useState<'ready' | 'set' | 'go' | null>(null);
  const countdownStartedRef = useRef(false);

  // Auto-show instructions for new players
  useEffect(() => {
    const hasSeenInstructions = localStorage.getItem('dscrmbl-seen-instructions');
    if (!hasSeenInstructions) {
      setShowInstructions(true);
      localStorage.setItem('dscrmbl-seen-instructions', 'true');
    }
  }, []);

  // Stable callbacks for timer
  const handleTimerExpire = useCallback(() => {
    timerExpired();
    playWrongSound();
  }, [timerExpired, playWrongSound]);

  // Timer hook
  const {
    timeRemaining,
    isRunning: isTimerRunning,
    isWarning: isTimerWarning,
    startTimer,
    stopTimer
  } = useTimer({
    initialTime: 30,
    onWarning: playTimerWarningSound,
    onExpire: handleTimerExpire,
    warningThreshold: 10
  });

  // Update countdown timer
  useEffect(() => {
    if (!canPlayToday) {
      const updateCountdown = () => {
        const time = getTimeUntilNextDay();
        setCountdown(
          `${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}:${String(time.seconds).padStart(2, '0')}`
        );
      };
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [canPlayToday]);

  // Handle game phase changes
  useEffect(() => {
    if (state.phase === 'playing' && state.timerModeEnabled) {
      startTimer();
    } else if (state.phase !== 'playing') {
      stopTimer();
    }
  }, [state.phase, state.timerModeEnabled, startTimer, stopTimer]);

  // Auto-transition to complete after final word is revealed
  useEffect(() => {
    if (state.phase === 'revealing' && state.wordIndex === 4 && state.playableWords.length === 0) {
      // After showing the 5th word result, automatically go to complete
      const timeout = setTimeout(() => {
        nextWord(); // This will set phase to 'complete' since no words remain
      }, 2000); // 2 second delay to show the revealed word
      return () => clearTimeout(timeout);
    }
  }, [state.phase, state.wordIndex, state.playableWords.length, nextWord]);

  // Persist streak breaks immediately
  useEffect(() => {
    if (state.phase === 'playing' || state.phase === 'revealing') {
      if (getCurrentStreak > 0 && state.streak === 0) {
        updateStreak(0); // Immediately save broken streak
      }
    }
  }, [state.streak, state.phase, getCurrentStreak, updateStreak]);

  // Handle game completion - use ref to prevent infinite loop
  useEffect(() => {
    if (state.phase === 'complete' && !gameCompleteHandled) {
      setGameCompleteHandled(true);
      playVictorySound();
      const { stats, percentile } = calculateFinalScore(state.score, true, dailyStats, state.streak);
      // Store game results for viewing later
      const statsWithResults = {
        ...stats,
        lastGameResults: {
          wordResults: state.wordResults,
          streakBonus: state.streakBonus,
          wordScores: state.wordScores
        }
      };
      setFinalStats(statsWithResults);
      setFinalPercentile(percentile);
      updateDailyStats(statsWithResults);
      setTimeout(() => setShowFinalScore(true), 1500);
    }
  }, [state.phase, gameCompleteHandled, state.score, state.streak, state.wordResults, state.streakBonus, state.wordScores, dailyStats, updateDailyStats, playVictorySound]);

  // Reset gameCompleteHandled when game restarts
  useEffect(() => {
    if (state.phase === 'idle') {
      setGameCompleteHandled(false);
      countdownStartedRef.current = false;
    }
  }, [state.phase]);

  // Reset countdown ref when moving to next word
  useEffect(() => {
    if (state.wordIndex > 0) {
      countdownStartedRef.current = false;
    }
  }, [state.wordIndex]);

  // Countdown sequence when game starts
  useEffect(() => {
    if (state.phase === 'playing' && state.wordIndex === 0 && !countdownStartedRef.current) {
      countdownStartedRef.current = true;

      const runCountdown = async () => {
        setStartCountdown('ready');
        await new Promise(resolve => setTimeout(resolve, 1000));
        setStartCountdown('set');
        await new Promise(resolve => setTimeout(resolve, 1000));
        setStartCountdown('go');
        await new Promise(resolve => setTimeout(resolve, 1000));
        setStartCountdown(null);
        setShowLetters(true);
      };

      runCountdown();
    }
  }, [state.phase, state.wordIndex, setShowLetters]);

  const handleStartGame = useCallback(() => {
    if (!canPlayToday || !theme) return;
    startGame(theme.wordList, getCurrentStreak);
  }, [canPlayToday, theme, startGame, getCurrentStreak]);

  const handleNextWord = useCallback(() => {
    nextWord();
  }, [nextWord]);

  const handleSubmit = useCallback((guess: string) => {
    const wasCorrect = guess.toUpperCase() === state.currentWord;
    submitGuess(guess);

    if (wasCorrect) {
      playCorrectSound();
    } else {
      playWrongSound();
    }
  }, [state.currentWord, submitGuess, playCorrectSound, playWrongSound]);

  const handleReplay = useCallback(() => {
    // Each word has 5 total replays
    if (state.replayCount >= 5) return;
    replayWord();
  }, [state.replayCount, replayWord]);

  const getStartButtonText = () => {
    if (state.phase === 'idle') {
      if (isThemeLoading) return 'LOADING...';
      return "PLAY TODAY'S CHALLENGE";
    }
    if (state.playableWords.length === 0) return 'FINAL WORD';
    if (state.playableWords.length === 1) return 'LAST WORD';
    return 'NEXT WORD';
  };

  const getStartButtonTag = () => {
    if (state.phase === 'idle') return `#${dailyNumber}`;
    if (state.playableWords.length === 0) return 'LAST';
    if (state.playableWords.length === 1) return 'LAST';
    return 'NEXT';
  };

  const isPlaying = state.phase === 'playing';
  const isRevealing = state.phase === 'revealing';
  const isComplete = state.phase === 'complete';
  const isFinalWordRevealing = isRevealing && state.wordIndex === 4 && state.playableWords.length === 0;
  const canStart = (state.phase === 'idle' && !isThemeLoading && !!theme) || (isRevealing && !isFinalWordRevealing);
  const showGameElements = isPlaying || isRevealing;

  // Handler to view past results
  const handleViewResults = useCallback(() => {
    if (dailyStats) {
      const { stats, percentile } = calculateFinalScore(todayScore ?? 0, true, dailyStats, dailyStats.currentStreak);
      setFinalStats(stats);
      setFinalPercentile(percentile);
      setShowFinalScore(true);
    }
  }, [todayScore, dailyStats]);

  // Handler to close final score modal
  const handleCloseFinalScore = useCallback(() => {
    setShowFinalScore(false);
    // Reset game to idle so "already played" screen shows
    if (state.phase === 'complete') {
      resetGame();
    }
  }, [state.phase, resetGame]);

  // Already played today
  if (!canPlayToday && state.phase === 'idle') {
    return (
      <GameContainer>
        <Header onInstructionsClick={() => setShowInstructions(true)} />

        <div id="already-played" className="already-played">
          <div className="already-played-content">
            <span className="already-played-icon">{String.fromCodePoint(0x2713)}</span>
            <p>You've completed today's challenge!</p>
            <p className="already-played-score">Your score: <strong id="today-score">{todayScore ?? 0}</strong></p>
            <p className="already-played-timer">Next challenge in: <strong id="countdown-timer">{countdown}</strong></p>
            <CyberButton
              id="view-results"
              variant="secondary"
              onClick={handleViewResults}
            >
              VIEW RESULTS
            </CyberButton>
          </div>
        </div>

        <ProgressTrack
          currentWordIndex={5}
          wordResults={todayResults?.wordResults ?? []}
          cumulativeScores={todayResults?.wordScores ?? []}
        />

        <InstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />

        <FinalScoreModal
          isOpen={showFinalScore}
          onClose={handleCloseFinalScore}
          dailyNumber={dailyNumber}
          score={todayScore ?? 0}
          stats={finalStats}
          percentile={finalPercentile}
          wordResults={todayResults?.wordResults ?? []}
          streakBonus={todayResults?.streakBonus ?? 0}
          themeName={theme?.themeName}
        />
      </GameContainer>
    );
  }

  return (
    <GameContainer>
      <Header onInstructionsClick={() => setShowInstructions(true)} />

      {!isComplete && !isFinalWordRevealing && (
        <SettingsPanel
          timerModeEnabled={state.timerModeEnabled}
          onTimerModeToggle={toggleTimerMode}
        />
      )}

      {/* Theme Display - always show when available */}
      {theme && !isThemeLoading && (
        <div className="theme-display">
          <div className="theme-name">{theme.themeName}</div>
          <div className="theme-description">{theme.description}</div>
        </div>
      )}

      {/* Theme Loading State */}
      {isThemeLoading && (
        <div className="theme-display">
          <div className="theme-loading">Loading today's theme...</div>
        </div>
      )}

      {/* Theme Error State */}
      {themeError && (
        <div className="theme-display theme-error">
          <div className="theme-error-message">Failed to load theme. Using fallback words.</div>
        </div>
      )}

      {/* Status Bar */}
      {(showGameElements || state.phase === 'idle') && (
        <StatusBar
          timeRemaining={timeRemaining}
          isTimerVisible={state.timerModeEnabled && isTimerRunning}
          isTimerWarning={isTimerWarning}
          streak={state.phase === 'idle' ? getCurrentStreak : state.streak}
        />
      )}

      {/* Attempts Display */}
      {showGameElements && (
        <AttemptsDisplay
          results={state.attemptResults}
          currentAttempt={state.attempts}
        />
      )}

      {/* Start Countdown */}
      {startCountdown && (
        <div className="start-countdown">
          <div key={startCountdown} className="countdown-text">
            {startCountdown.toUpperCase()}
          </div>
        </div>
      )}

      {/* Word Output */}
      {showGameElements && (
        <WordOutput
          word={state.currentWord}
          isRevealed={isRevealing}
          showLetters={state.showLetters}
          animationTrigger={state.animationTrigger}
        />
      )}

      {/* Action Buttons - hide when complete or when revealing final word */}
      {!isComplete && !isFinalWordRevealing && (
        <div className="action-grid action-grid--daily">
          <CyberButton
            id="start-game"
            variant="primary"
            tag={getStartButtonTag()}
            disabled={!canStart}
            onClick={canStart ? (state.phase === 'idle' ? handleStartGame : handleNextWord) : undefined}
          >
            {getStartButtonText()}
          </CyberButton>
          <CyberButton
            id="repeat"
            variant="secondary"
            disabled={!isPlaying || state.replayCount >= 5}
            onClick={handleReplay}
          >
            REPLAY ({5 - state.replayCount})
          </CyberButton>
        </div>
      )}

      {/* Input Zone */}
      {showGameElements && (
        <InputZone
          onSubmit={handleSubmit}
          disabled={!isPlaying}
        />
      )}

      {/* Progress Track */}
      <ProgressTrack
        currentWordIndex={state.wordIndex}
        wordResults={state.wordResults}
        cumulativeScores={state.wordScores}
      />

      {/* Modals */}
      <InstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />

      <FinalScoreModal
        isOpen={showFinalScore}
        onClose={handleCloseFinalScore}
        dailyNumber={dailyNumber}
        score={state.score}
        stats={finalStats}
        percentile={finalPercentile}
        wordResults={state.wordResults}
        streakBonus={state.streakBonus}
        themeName={theme?.themeName}
      />
    </GameContainer>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AudioProvider>
        <GameProvider>
          <GameContent />
        </GameProvider>
      </AudioProvider>
    </ThemeProvider>
  );
}

export default App;
