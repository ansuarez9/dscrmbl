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
import { TutorialScreen } from './components/Tutorial/TutorialScreen';
import { ModalShell } from './components/Modals/ModalShell';
import { loadTutorialBoot, useTutorial, type TutorialBoot } from './hooks/useTutorial';
import { InstructionsModal } from './components/Modals/InstructionsModal';
import { FinalScoreModal } from './components/Modals/FinalScoreModal';
import { ContactModal } from './components/Modals/ContactModal';
// Monetization disabled — re-enable when ready
// import { MerchModal } from './components/Modals/MerchModal';
import { HighScoreCelebration } from './components/Effects/HighScoreCelebration';
import { useDailyChallenge } from './hooks/useDailyChallenge';
import { useDailyTheme } from './hooks/useDailyTheme';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useTimer } from './hooks/useTimer';
import { useLocalDay } from './hooks/useLocalDay';
import { storedDateKey } from './utils/localDate';
import { getThemeExplanation } from './utils/themeExplanation';
import { getRecordedPercentile } from './utils/scoring';
import { getDailyNumber, getTimeUntilNextDay } from './utils/seededRandom';
import { isValidWord, isDictionaryLoaded } from './utils/dictionary';
import { getSpecialEventEmoji } from './utils/specialEvent';
// Monetization disabled — re-enable when ready (used for sponsor + merch tracking)
// import { trackGameEvent } from './utils/analytics';
import type { DailyStats, HistoryPercentile, WordResult, ThemeExplanation } from './types/game';

type ResultSnapshot = {
  dailyNumber: number;
  score: number;
  stats: DailyStats | null;
  percentile: HistoryPercentile;
  wordResults: WordResult[];
  wordScores: number[];
  words?: string[];
  explanation?: ThemeExplanation;
  streakBonus: number;
  themeName?: string;
  isNewHighScore: boolean;
  isDailyChallenge: boolean;
  animateCelebration: boolean;
};

function GameContent({ tutorialBoot }: { tutorialBoot: TutorialBoot }) {
  const { state, startGame, nextWord, startWordTimer, submitGuess, replayWord, timerExpired, toggleHardMode, resetGame } = useGameContext();
  const { playCorrectSound, playWrongSound, playVictorySound, playTimerWarningSound, playHighScoreJingle } = useAudioContext();
  const today = useLocalDay();
  const dailyRoundActive = state.isDailyChallenge && state.phase !== 'idle';
  const { dailyNumber, canPlayToday, todayScore, todayResults, dailyStats, recordDailyCompletion, getCurrentStreak, updateStreak } = useDailyChallenge(today, dailyRoundActive, state.roundDate);
  const { theme, practiceTheme, isLoading: isThemeLoading, error: themeError, retry } = useDailyTheme(today);

  const tutorial = useTutorial(tutorialBoot);
  const returnFromTutorial = useRef(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showFinalScore, setShowFinalScore] = useState(false);
  const [showContact, setShowContact] = useState(false);
  // Monetization disabled — re-enable when ready
  // const [showMerch, setShowMerch] = useState(false);
  const [modalResult, setModalResult] = useState<ResultSnapshot | null>(null);
  const [countdown, setCountdown] = useState('--:--:--');
  const [gameCompleteHandled, setGameCompleteHandled] = useState(false);
  const [startCountdown, setStartCountdown] = useState<'ready' | 'set' | 'go' | null>(null);
  const [wordValidationError, setWordValidationError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const gameplayRef = useRef<HTMLElement>(null);
  const scrollRequested = useRef(false);
  const timedOut = useRef(false);
  const [announcement, setAnnouncement] = useState('');
  const lastOutcome = useRef('');

  useEffect(() => {
    setWordValidationError(null);
  }, [state.wordIndex, state.phase]);

  useEffect(() => {
    if (state.phase === 'revealing') {
      const result = state.wordResults[state.wordIndex];
      const key = `${state.wordIndex}:${state.phase}`;
      if (lastOutcome.current !== key && result) {
        setAnnouncement(`${timedOut.current ? 'Time expired. ' : ''}${result.solved ? 'Correct!' : 'Word not solved.'} The word was ${state.currentWord}.`);
        lastOutcome.current = key;
      }
    } else if (state.phase === 'playing') {
      const key = `${state.wordIndex}:${state.attempts}`;
      if (lastOutcome.current !== key) {
        setAnnouncement(state.attempts > 1 ? `Incorrect guess. ${4 - state.attempts} attempts remaining.` : `Word ${state.wordIndex + 1} of 5. ${state.currentWord.length} letters.`);
        lastOutcome.current = key;
        timedOut.current = false;
      }
    } else if (state.phase === 'idle') {
      lastOutcome.current = '';
      setAnnouncement('');
    }
  }, [state.phase, state.wordIndex, state.attempts, state.wordResults, state.currentWord]);

  useEffect(() => {
    if (!scrollRequested.current || state.phase !== 'playing') return;
    scrollRequested.current = false;
    const section = gameplayRef.current;
    const bounds = section?.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    if (bounds && (bounds.top < 0 || bounds.bottom > viewportHeight)) {
      section?.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
    }
  }, [state.phase, state.wordIndex]);

  useEffect(() => {
    if (state.phase !== 'revealing' || document.querySelector('[role="dialog"]')) return;
    const next = document.querySelector<HTMLElement>('#start-game:not(:disabled)');
    const answer = document.querySelector<HTMLElement>('.word-output');
    (next ?? answer)?.focus({ preventScroll: true });
  }, [state.phase]);

  useEffect(() => {
    if (!returnFromTutorial.current || tutorial.active) return;
    returnFromTutorial.current = false;
    const selector = !canPlayToday ? '#view-results' : themeError ? '#retry-theme' : !isThemeLoading && theme ? '#start-game' : 'h1';
    document.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
  }, [tutorial.active, canPlayToday, themeError, isThemeLoading, theme]);

  // Stable callbacks for timer
  const handleTimerExpire = useCallback((deadline: number) => {
    timedOut.current = true;
    timerExpired(deadline);
    playWrongSound();
  }, [timerExpired, playWrongSound]);

  // Timer hook
  const {
    timeRemaining,
    isRunning: isTimerRunning,
    isWarning: isTimerWarning
  } = useTimer({
    deadline: state.phase === 'playing' ? state.wordDeadline : null,
    initialTime: 20,
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
    if (state.isDailyChallenge && (state.phase === 'playing' || state.phase === 'revealing')) {
      if (getCurrentStreak > 0 && state.streak === 0) {
        updateStreak(0); // Immediately save broken streak
      }
    }
  }, [state.streak, state.phase, state.isDailyChallenge, getCurrentStreak, updateStreak]);

  // Handle game completion - use ref to prevent infinite loop
  useEffect(() => {
    if (state.phase === 'complete' && !gameCompleteHandled) {
      setGameCompleteHandled(true);
      if (!state.isDailyChallenge) {
        setModalResult({ dailyNumber: 0, score: state.score, stats: null,
          percentile: { history: [], percentile: 100 }, wordResults: state.wordResults,
          wordScores: state.wordScores, words: state.roundTheme?.wordList,
          explanation: getThemeExplanation(state.roundTheme?.explanation, state.roundTheme?.wordList),
          streakBonus: state.streakBonus, themeName: state.roundTheme?.themeName,
          isNewHighScore: false, isDailyChallenge: false, animateCelebration: false });
        playVictorySound();
        setTimeout(() => setShowFinalScore(true), 1500);
        return;
      }
      const completion = recordDailyCompletion(state.score, state.streak, {
        wordResults: state.wordResults,
        streakBonus: state.streakBonus,
        wordScores: state.wordScores,
        isNewHighScore: false
      }, state.roundTheme, state.roundDate ?? today);
      if (!completion) return;
      const { stats, percentile, isNewHighScore: newHigh } = completion;

      if (newHigh) {
        playHighScoreJingle();
      } else {
        playVictorySound();
      }

      setModalResult({ dailyNumber: getDailyNumber(state.roundDate ?? today), score: state.score,
        stats, percentile, wordResults: state.wordResults, wordScores: state.wordScores,
        words: state.roundTheme?.wordList,
        explanation: getThemeExplanation(state.roundTheme?.explanation, state.roundTheme?.wordList),
        streakBonus: state.streakBonus,
        themeName: state.roundTheme?.themeName, isNewHighScore: newHigh,
        isDailyChallenge: true, animateCelebration: true });
      setTimeout(() => setShowFinalScore(true), 1500);
    }
  }, [state.phase, state.isDailyChallenge, gameCompleteHandled, state.score, state.streak, state.wordResults, state.streakBonus, state.wordScores, state.roundTheme, state.roundDate, today, recordDailyCompletion, playVictorySound, playHighScoreJingle]);

  useEffect(() => {
    if (reducedMotion || state.phase !== 'complete' || !modalResult?.isNewHighScore || !modalResult.animateCelebration) return;
    const root = document.getElementById('root');
    const begin = window.setTimeout(() => root?.classList.add('crt-glitch'), 1100);
    const end = window.setTimeout(() => root?.classList.remove('crt-glitch'), 1400);
    return () => { clearTimeout(begin); clearTimeout(end); root?.classList.remove('crt-glitch'); };
  }, [state.phase, modalResult, reducedMotion]);

  useEffect(() => {
    if (showFinalScore) { setShowInstructions(false); setShowContact(false); }
  }, [showFinalScore]);

  // Reset gameCompleteHandled when game restarts
  useEffect(() => {
    if (state.phase === 'idle') {
      setGameCompleteHandled(false);
    }
  }, [state.phase]);

  // Countdown sequence when game starts
  useEffect(() => {
    if (state.phase !== 'playing' || state.wordIndex !== 0 || (state.timerModeEnabled && state.wordDeadline !== null)) {
      return;
    }

    setStartCountdown('ready');
    const set = window.setTimeout(() => setStartCountdown('set'), 1000);
    const go = window.setTimeout(() => setStartCountdown('go'), 2000);
    const begin = window.setTimeout(() => {
      setStartCountdown(null);
      startWordTimer(0); // The deadline and first letter animation begin together.
    }, 3000);
    return () => {
      clearTimeout(set);
      clearTimeout(go);
      clearTimeout(begin);
    };
  }, [state.phase, state.wordIndex, state.timerModeEnabled, state.wordDeadline, startWordTimer]);

  const handleStartGame = useCallback(() => {
    if (!canPlayToday || !theme) return;
    scrollRequested.current = true;
    startGame(theme, true, getCurrentStreak, today);
  }, [canPlayToday, theme, startGame, getCurrentStreak, today]);

  const handleStartPractice = useCallback(() => {
    if (isThemeLoading || !themeError || state.phase !== 'idle') return;
    scrollRequested.current = true;
    startGame(practiceTheme, false, 0, null);
  }, [isThemeLoading, themeError, state.phase, practiceTheme, startGame]);

  const handleNextWord = useCallback(() => {
    scrollRequested.current = true;
    nextWord();
  }, [nextWord]);

  const handleSubmit = useCallback((guess: string) => {
    const submittedAt = Date.now();
    if (state.timerModeEnabled) {
      if (state.wordDeadline === null) return false;
      if (submittedAt >= state.wordDeadline) {
        timedOut.current = true;
        timerExpired(state.wordDeadline);
        playWrongSound();
        return false;
      }
    }
    const isCorrectAnswer = guess.toUpperCase() === state.currentWord;

    if (!isCorrectAnswer && isDictionaryLoaded() && !isValidWord(guess)) {
      setWordValidationError('Not a valid word');
      playWrongSound();
      return false;
    }

    setWordValidationError(null);
    submitGuess(guess, submittedAt);

    if (isCorrectAnswer) {
      playCorrectSound();
    } else {
      playWrongSound();
    }
    return true;
  }, [state.currentWord, state.timerModeEnabled, state.wordDeadline, submitGuess, timerExpired, playCorrectSound, playWrongSound]);

  const handleReplay = useCallback(() => {
    // Each word has 5 total replays in normal mode, 3 in hard mode
    const maxReplays = state.hardModeEnabled ? 3 : 5;
    if (state.replayCount >= maxReplays) return;
    replayWord();
  }, [state.replayCount, state.hardModeEnabled, replayWord]);

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
  const showVisibleFeedback = (isPlaying && state.attempts > 1) ||
    ((isRevealing || isComplete) && state.wordResults[state.wordIndex]?.solved === false);
  const isFinalWordRevealing = isRevealing && state.wordIndex === 4 && state.playableWords.length === 0;
  const canStart = (state.phase === 'idle' && canPlayToday && !isThemeLoading && !!theme) || (isRevealing && !isFinalWordRevealing);
  const activeTheme = state.phase === 'idle' ? theme : state.roundTheme ?? theme;

  const recoveryControls = state.phase === 'idle' && (isThemeLoading || themeError) && (
    <div className="theme-display theme-error" role="status" aria-live="polite">
      {isThemeLoading ? (
        <div className="theme-loading">Loading today's challenge...</div>
      ) : (
        <>
          <div className="theme-error-message">{themeError}</div>
          <div className="action-grid theme-recovery-actions">
            <CyberButton id="retry-theme" variant="secondary" onClick={retry}>RETRY</CyberButton>
            <CyberButton id="practice-round" variant="primary" onClick={handleStartPractice}>
              PLAY FALLBACK PRACTICE ROUND
            </CyberButton>
          </div>
        </>
      )}
    </div>
  );

  const lastResultDate = storedDateKey(dailyStats?.lastGameResults?.challengeDate ?? dailyStats?.lastPlayed);
  const hasPastResult = !!(dailyStats?.lastGameResults && lastResultDate && lastResultDate < today);

  // Viewing a result only reads the recorded completion, including its puzzle content.
  const handleViewResults = useCallback(() => {
    if (!dailyStats) return;
    const result = dailyStats.lastGameResults;
    const resultDate = storedDateKey(result?.challengeDate ?? dailyStats.lastPlayed);
    const isToday = resultDate === today;
    setModalResult({ dailyNumber: result?.dailyNumber ?? (resultDate ? getDailyNumber(resultDate) : dailyNumber),
      score: dailyStats.score, stats: dailyStats,
      percentile: { history: dailyStats.history, percentile: result?.percentile ?? getRecordedPercentile(dailyStats.history, dailyStats.score) },
      wordResults: result?.wordResults ?? [], wordScores: result?.wordScores ?? [],
      words: result?.words ?? (isToday && theme && !themeError ? theme.wordList : undefined),
      explanation: getThemeExplanation(result?.explanation, result?.words),
      streakBonus: result?.streakBonus ?? 0,
      themeName: result?.themeName ?? (isToday && theme && !themeError ? theme.themeName : undefined),
      isNewHighScore: result?.isNewHighScore ?? false,
      isDailyChallenge: true, animateCelebration: false });
    setShowFinalScore(true);
  }, [dailyNumber, dailyStats, today, theme, themeError]);

  // Handler to close final score modal
  const handleCloseFinalScore = useCallback(() => {
    setShowFinalScore(false);
    // Reset game to idle so "already played" screen shows
    if (state.phase === 'complete') {
      resetGame();
    }
  }, [state.phase, resetGame]);

  const resultModal = modalResult && <FinalScoreModal
    isOpen={showFinalScore}
    onClose={handleCloseFinalScore}
    {...modalResult}
  />;

  const launchTutorial = (resume = false) => {
    // Never replace an unfinished daily or fallback round, even via a stale Help action.
    if (state.phase !== 'idle' || showFinalScore || tutorial.active) return;
    setShowInstructions(false);
    setShowContact(false);
    tutorial.send({ type: resume ? 'resume' : 'start' });
  };
  const exitTutorial = () => {
    returnFromTutorial.current = true;
    tutorial.send({ type: 'exit' });
  };
  const tutorialActions = <section className="instruction-section tutorial-help" aria-label="Practice tutorial">
    <h3>QUICK PRACTICE</h3>
    <p>Learn with two short words. Your daily score and streak won’t change.</p>
    {state.phase !== 'idle' && <p id="tutorial-unavailable">Finish your current round to start the tutorial.</p>}
    <div className="tutorial-help-actions">
      {tutorial.record.run && <CyberButton variant="primary" disabled={state.phase !== 'idle'} onClick={() => launchTutorial(true)}
        aria-describedby={state.phase !== 'idle' ? 'tutorial-unavailable' : undefined}>RESUME TUTORIAL</CyberButton>}
      <CyberButton variant={tutorial.record.run ? 'secondary' : 'primary'} disabled={state.phase !== 'idle'}
        aria-describedby={state.phase !== 'idle' ? 'tutorial-unavailable' : undefined} onClick={() => launchTutorial()}>
        {tutorial.record.run ? 'RESTART TUTORIAL' : tutorial.record.completed ? 'REPLAY TUTORIAL' : 'START TUTORIAL'}
      </CyberButton>
    </div>
  </section>;
  const instructionsModal = !showFinalScore && <InstructionsModal isOpen={showInstructions}
    onClose={() => setShowInstructions(false)} tutorialActions={tutorialActions} />;
  const invitation = !showInstructions && !showContact && !showFinalScore && <ModalShell id="tutorial-invitation" isOpen={tutorial.invitation && state.phase === 'idle'}
    onClose={() => tutorial.send({ type: 'dismiss' })} labelledBy="tutorial-invitation-title" describedBy="tutorial-invitation-description" dismissOnBackdrop>
    <div className="modal-header">
      <h2 id="tutorial-invitation-title" className="modal-title">Try a quick practice?</h2>
      <button className="modal-close-btn" aria-label="Skip practice" onClick={() => tutorial.send({ type: 'dismiss' })}>✕</button>
    </div>
    <div className="modal-content">
      <p id="tutorial-invitation-description">Learn with two short words. Your daily score and streak won’t change.</p>
      <div className="tutorial-help-actions">
        <CyberButton variant="primary" onClick={() => launchTutorial()}>START PRACTICE</CyberButton>
        <CyberButton variant="secondary" onClick={() => tutorial.send({ type: 'dismiss' })}>SKIP FOR NOW</CyberButton>
        <CyberButton variant="secondary" onClick={() => { tutorial.send({ type: 'dismiss' }); setShowInstructions(true); }}>READ INSTRUCTIONS</CyberButton>
      </div>
    </div>
  </ModalShell>;

  if (tutorial.active) return <TutorialScreen tutorial={tutorial} onExit={exitTutorial}
    returnLabel={!canPlayToday ? 'BACK TO COMPLETED CHALLENGE' : !isThemeLoading && theme && !themeError ? 'BACK TO DAILY CHALLENGE' : 'BACK TO GAME'} />;

  // Monetization disabled — re-enable when ready
  // const handleMerchOpen = useCallback(() => {
  //   trackGameEvent.merchModalOpen();
  //   setShowMerch(true);
  // }, []);

  // Already played today
  if (!canPlayToday && state.phase === 'idle') {
    return (
      <GameContainer>
        <Header onInstructionsClick={() => setShowInstructions(true)} onContactClick={() => setShowContact(true)} />

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
            {recoveryControls}
          </div>
        </div>

        <ProgressTrack
          currentWordIndex={5}
          wordResults={todayResults?.wordResults ?? []}
          cumulativeScores={todayResults?.wordScores ?? []}
        />

        {instructionsModal}
        {invitation}
        {!showFinalScore && <ContactModal isOpen={showContact} onClose={() => setShowContact(false)} />}
        {/* Monetization disabled — re-enable when ready
        <MerchModal isOpen={showMerch} onClose={() => setShowMerch(false)} />
        */}

        {resultModal}
      </GameContainer>
    );
  }

  return (
    <GameContainer>
      <Header onInstructionsClick={() => setShowInstructions(true)} onContactClick={() => setShowContact(true)} />

      {/* Settings Panel - only show before game starts */}
      {state.phase === 'idle' && !isComplete && (
        <SettingsPanel
          hardModeEnabled={state.hardModeEnabled}
          onHardModeToggle={toggleHardMode}
          timeRemaining={timeRemaining}
          isTimerVisible={state.timerModeEnabled}
          isTimerWarning={isTimerWarning}
          streak={getCurrentStreak}
          highScore={dailyStats?.highScore ?? 0}
        />
      )}

      {state.phase === 'idle' && hasPastResult && lastResultDate && (
        <div className="last-results-action">
          <button type="button" onClick={handleViewResults}>View last results</button>
          <span>Completed <time dateTime={lastResultDate}>{lastResultDate}</time></span>
        </div>
      )}

      {/* Theme Display - always show when available */}
      {state.phase !== 'idle' && !state.isDailyChallenge && (
        <div className="theme-display"><div className="theme-name">PRACTICE ROUND</div></div>
      )}
      {activeTheme && (state.phase !== 'idle' || !isThemeLoading) && (
        <div className="theme-display">
          {activeTheme.specialEvent && state.isDailyChallenge && (
            <div className="theme-special-event">
              {getSpecialEventEmoji(activeTheme.specialEvent)} {activeTheme.specialEvent}
            </div>
          )}
          <div className="theme-name">{activeTheme.themeName}</div>
          <div className="theme-description">{activeTheme.description}</div>
          {/* Monetization disabled — re-enable when ready
          {theme.sponsor && (
            theme.sponsor.url ? (
              <a
                className="sponsor-chip"
                href={theme.sponsor.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackGameEvent.sponsorClick(theme.sponsor!.name)}
              >
                <span className="sponsor-chip-label">Brought to you by</span>
                <span className="sponsor-chip-name">{theme.sponsor.name}</span>
                {theme.sponsor.tagline && (
                  <span className="sponsor-chip-tagline">{theme.sponsor.tagline}</span>
                )}
              </a>
            ) : (
              <div className="sponsor-chip sponsor-chip--static">
                <span className="sponsor-chip-label">Brought to you by</span>
                <span className="sponsor-chip-name">{theme.sponsor.name}</span>
                {theme.sponsor.tagline && (
                  <span className="sponsor-chip-tagline">{theme.sponsor.tagline}</span>
                )}
              </div>
            )
          )}
          */}
        </div>
      )}

      {/* Theme Loading State */}
      {recoveryControls}

      <section ref={gameplayRef} className={`gameplay ${state.phase !== 'idle' ? 'gameplay--active' : ''}`} aria-label="Game">
      <p className={`game-feedback${showVisibleFeedback ? '' : ' sr-only'}`} role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
      {/* Status Bar - only show during gameplay */}
      {state.phase !== 'idle' && (
        <StatusBar
          timeRemaining={timeRemaining}
          isTimerVisible={state.timerModeEnabled && (isTimerRunning || startCountdown !== null)}
          isTimerWarning={isTimerWarning}
          streak={state.streak}
        />
      )}

      {/* Attempts Display */}
      <AttemptsDisplay
        results={state.attemptResults}
        currentAttempt={state.attempts}
      />

      {/* Word Output */}
      <WordOutput
        word={state.currentWord}
        isRevealed={isRevealing}
        showLetters={state.showLetters}
        animationTrigger={state.animationTrigger}
        startCountdown={startCountdown}
        timeBonus={isRevealing ? state.lastTimeBonus : 0}
      />

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
            disabled={!isPlaying || (state.timerModeEnabled && state.wordDeadline === null) || state.replayCount >= (state.hardModeEnabled ? 3 : 5)}
            onClick={handleReplay}
            onPointerDown={event => { if (document.activeElement?.id === 'user-input') event.preventDefault(); }}
          >
            REPLAY ({(state.hardModeEnabled ? 3 : 5) - state.replayCount})
          </CyberButton>
        </div>
      )}

      {/* Input Zone */}
      <InputZone
        onSubmit={handleSubmit}
        disabled={!isPlaying || (state.timerModeEnabled && state.wordDeadline === null)}
        errorMessage={wordValidationError}
        onErrorClear={() => setWordValidationError(null)}
        wordIndex={state.wordIndex}
        modalOpen={showInstructions || showContact || showFinalScore}
      />

      </section>

      {/* Progress Track */}
      <ProgressTrack
        currentWordIndex={state.wordIndex}
        wordResults={state.wordResults}
        cumulativeScores={state.wordScores}
      />

      {/* Modals */}
      {instructionsModal}
      {invitation}
      {!showFinalScore && <ContactModal isOpen={showContact} onClose={() => setShowContact(false)} />}
      {/* Monetization disabled — re-enable when ready
      <MerchModal isOpen={showMerch} onClose={() => setShowMerch(false)} />
      */}

      {resultModal}

      {!reducedMotion && showFinalScore && modalResult?.isNewHighScore && modalResult.animateCelebration && <HighScoreCelebration />}
    </GameContainer>
  );
}

function App() {
  const [tutorialBoot] = useState(loadTutorialBoot);
  return (
    <ThemeProvider>
      <AudioProvider>
        <GameProvider>
          <GameContent tutorialBoot={tutorialBoot} />
        </GameProvider>
      </AudioProvider>
    </ThemeProvider>
  );
}

export default App;
