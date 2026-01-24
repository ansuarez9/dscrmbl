import { useState, useEffect, useCallback } from 'react';
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
import { useTimer } from './hooks/useTimer';
import { calculateFinalScore } from './utils/scoring';
import { getTimeUntilNextDay } from './utils/seededRandom';
import type { DailyStats, HistoryPercentile } from './types/game';

function GameContent() {
  const { state, startGame, nextWord, submitGuess, replayWord, timerExpired, toggleTimerMode, triggerAnimation } = useGameContext();
  const { playCorrectSound, playWrongSound, playVictorySound, playTimerWarningSound } = useAudioContext();
  const { dailyNumber, dailyWords, canPlayToday, todayScore, todayResults, dailyStats, updateDailyStats } = useDailyChallenge();

  const [showInstructions, setShowInstructions] = useState(false);
  const [showFinalScore, setShowFinalScore] = useState(false);
  const [finalStats, setFinalStats] = useState<DailyStats | null>(null);
  const [finalPercentile, setFinalPercentile] = useState<HistoryPercentile>({ history: [], percentile: 100 });
  const [countdown, setCountdown] = useState('--:--:--');
  const [gameCompleteHandled, setGameCompleteHandled] = useState(false);

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

  // Handle game completion - use ref to prevent infinite loop
  useEffect(() => {
    if (state.phase === 'complete' && !gameCompleteHandled) {
      setGameCompleteHandled(true);
      playVictorySound();
      const { stats, percentile } = calculateFinalScore(state.score, true, dailyStats);
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
  }, [state.phase, gameCompleteHandled, state.score, state.wordResults, state.streakBonus, state.wordScores, dailyStats, updateDailyStats, playVictorySound]);

  // Reset gameCompleteHandled when game restarts
  useEffect(() => {
    if (state.phase === 'idle') {
      setGameCompleteHandled(false);
    }
  }, [state.phase]);

  const handleStartGame = useCallback(() => {
    if (!canPlayToday) return;
    startGame(dailyWords);
  }, [canPlayToday, dailyWords, startGame]);

  const handleNextWord = useCallback(() => {
    nextWord();
  }, [nextWord]);

  const handleSubmit = useCallback((guess: string) => {
    const wasCorrect = guess.toUpperCase() === state.currentWord;
    const currentAttempts = state.attempts; // Capture current attempts before submit
    submitGuess(guess);

    if (wasCorrect) {
      playCorrectSound();
    } else {
      playWrongSound();
      // Auto replay after wrong guess if attempts remain (check current, not next)
      if (currentAttempts < 3) {
        setTimeout(() => {
          triggerAnimation(); // Trigger animation without incrementing replay count
        }, 1500);
      }
    }
  }, [state.currentWord, state.attempts, submitGuess, triggerAnimation, playCorrectSound, playWrongSound]);

  const handleReplay = useCallback(() => {
    if (state.replayCount >= 2) return;
    replayWord(); // This increments replay count and triggers animation
  }, [state.replayCount, replayWord]);

  const getStartButtonText = () => {
    if (state.phase === 'idle') return "PLAY TODAY'S CHALLENGE";
    if (state.playableWords.length === 0) return 'FINAL WORD';
    return 'NEXT WORD';
  };

  const getStartButtonTag = () => {
    if (state.phase === 'idle') return `#${dailyNumber}`;
    if (state.playableWords.length === 0) return 'LAST';
    return 'NEXT';
  };

  const isPlaying = state.phase === 'playing';
  const isRevealing = state.phase === 'revealing';
  const isComplete = state.phase === 'complete';
  const isFinalWordRevealing = isRevealing && state.wordIndex === 4 && state.playableWords.length === 0;
  const canStart = state.phase === 'idle' || (isRevealing && !isFinalWordRevealing);
  const showGameElements = isPlaying || isRevealing;

  // Handler to view past results
  const handleViewResults = useCallback(() => {
    if (todayResults && dailyStats) {
      const { stats, percentile } = calculateFinalScore(todayScore ?? 0, true, dailyStats);
      setFinalStats(stats);
      setFinalPercentile(percentile);
      setShowFinalScore(true);
    }
  }, [todayResults, todayScore, dailyStats]);

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
            {todayResults && (
              <CyberButton
                id="view-results"
                variant="secondary"
                onClick={handleViewResults}
              >
                VIEW RESULTS
              </CyberButton>
            )}
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
          onClose={() => setShowFinalScore(false)}
          dailyNumber={dailyNumber}
          score={todayScore ?? 0}
          stats={finalStats}
          percentile={finalPercentile}
          wordResults={todayResults?.wordResults ?? []}
          streakBonus={todayResults?.streakBonus ?? 0}
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
            tag={`${2 - state.replayCount}x`}
            disabled={!isPlaying || state.replayCount >= 2}
            onClick={handleReplay}
          >
            REPLAY
          </CyberButton>
        </div>
      )}

      {/* Status Bar */}
      {showGameElements && (
        <StatusBar
          timeRemaining={timeRemaining}
          isTimerVisible={state.timerModeEnabled && isTimerRunning}
          isTimerWarning={isTimerWarning}
          streak={state.streak}
        />
      )}

      {/* Attempts Display */}
      {showGameElements && (
        <AttemptsDisplay
          results={state.attemptResults}
          currentAttempt={state.attempts}
        />
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
        onClose={() => setShowFinalScore(false)}
        dailyNumber={dailyNumber}
        score={state.score}
        stats={finalStats}
        percentile={finalPercentile}
        wordResults={state.wordResults}
        streakBonus={state.streakBonus}
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
