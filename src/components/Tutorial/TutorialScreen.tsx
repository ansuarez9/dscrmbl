import { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer } from '../Layout/GameContainer';
import { Header } from '../Layout/Header';
import { CyberButton } from '../Buttons/CyberButton';
import { InputZone } from '../Game/InputZone';
import { WordOutput } from '../Game/WordOutput';
import { AttemptsDisplay } from '../Game/AttemptsDisplay';
import { ProgressTrack } from '../Game/ProgressTrack';
import { InstructionsModal } from '../Modals/InstructionsModal';
import { ContactModal } from '../Modals/ContactModal';
import { useAudioContext } from '../../context/AudioContext';
import { isDictionaryLoaded, isValidWord } from '../../utils/dictionary';
import type { useTutorial } from '../../hooks/useTutorial';

interface Props {
  tutorial: ReturnType<typeof useTutorial>;
  onExit: () => void;
  returnLabel: string;
}

function ColorGuide() {
  return <ul className="tutorial-colors">
    <li><span className="text-success">Green ✓</span> — solved first try without Replay.</li>
    <li><span className="tutorial-yellow">Yellow ≈</span> — solved after another guess or Replay.</li>
    <li><span className="text-danger">Red ✗</span> — not solved after three guesses; zero points.</li>
  </ul>;
}

export function TutorialScreen({ tutorial, onExit, returnLabel }: Props) {
  const { record, summary, send } = tutorial;
  const game = record.run?.game ?? summary!;
  const stage = summary ? 'summary' : record.run!.stage;
  const heading = useRef<HTMLHeadingElement>(null);
  const section = useRef<HTMLElement>(null);
  const [countdown, setCountdown] = useState<'ready' | 'set' | 'go'>('ready');
  const [error, setError] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const [contact, setContact] = useState(false);
  const { playCorrectSound, playWrongSound } = useAudioContext();

  useEffect(() => {
    if (stage !== 'countdown') return;
    setCountdown('ready');
    const set = window.setTimeout(() => setCountdown('set'), 1000);
    const go = window.setTimeout(() => setCountdown('go'), 2000);
    const begin = window.setTimeout(() => send({ type: 'flash' }), 3000);
    return () => { clearTimeout(set); clearTimeout(go); clearTimeout(begin); };
  }, [stage, send]);

  useEffect(() => { setError(null); }, [game.wordIndex, stage === 'result']);
  useEffect(() => {
    if (document.querySelector('[role="dialog"]')) return;
    if (stage === 'ready' || stage === 'summary') heading.current?.focus({ preventScroll: true });
    if (stage === 'result') section.current?.querySelector<HTMLElement>('#tutorial-continue')?.focus({ preventScroll: true });
    if (stage === 'ready' || stage === 'summary') section.current?.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
  }, [stage, game.wordIndex]);

  const watched = useCallback(() => send({ type: 'watched' }), [send]);
  const result = game.wordResults[game.wordIndex];
  const resultDescription = result?.solved
    ? result.attempts === 1 && !result.usedReplay ? 'Green ✓ — a clean first-try solve.' : 'Yellow ≈ — solved with another guess or Replay.'
    : 'Red ✗ — no points for an unsolved word. You can still continue.';
  let guidance = game.wordIndex === 0
    ? 'Watch the letters flash in their positions, in a random order. Remember the word, then type your guess.'
    : 'This time, try Replay if you need another look.';
  if (stage === 'flashing') guidance = game.replayCount > 0 ? 'Watch again, then enter your guess.' : 'Watch the letters. Each one flashes briefly.';
  if (stage === 'guessing') guidance = game.replayCount >= 5
    ? 'No replays left for this word. Try a guess, or exit and restart the tutorial from Help.'
    : game.replayCount > 0 ? 'Watch again, then enter your guess.'
    : game.wordIndex === 0 ? 'Type your guess, then press Submit or Enter.'
    : 'Replay shows the letters again. It helps, but reduces your unused-replay bonus and breaks a clean streak.';
  if (stage === 'result') guidance = resultDescription;
  const outcome = stage === 'result' ? `${result?.solved ? 'Correct.' : 'Word not solved.'} The word was ${game.currentWord}.` :
    stage === 'guessing' && game.attempts > 1 ? `Incorrect guess. ${4 - game.attempts} attempts remaining.` : '';
  const inputDisabled = stage !== 'guessing' && !(stage === 'flashing' && game.replayCount > 0);

  const submit = (guess: string) => {
    if (inputDisabled) return false;
    if (guess.toUpperCase() !== game.currentWord && isDictionaryLoaded() && !isValidWord(guess)) {
      setError('Not a valid word'); playWrongSound(); return false;
    }
    setError(null);
    send({ type: 'guess', guess, submittedAt: Date.now() });
    if (guess.toUpperCase() === game.currentWord) playCorrectSound(); else playWrongSound();
    return true;
  };

  return <GameContainer>
    <Header onInstructionsClick={() => setHelp(true)} onContactClick={() => setContact(true)} />
    <div className="tutorial-toolbar">
      <p className="tutorial-label">TUTORIAL PRACTICE · NORMAL MODE</p>
      <CyberButton variant="secondary" onClick={onExit}>EXIT PRACTICE</CyberButton>
    </div>
    <section className="gameplay gameplay--active tutorial-game" aria-label="Practice tutorial" ref={section}>
      <h2 className="tutorial-heading" tabIndex={-1} ref={heading}>
        {stage === 'summary' ? 'Practice finished' : game.wordIndex === 0 ? 'Watch and guess' : 'Try a replay'}
      </h2>
      {stage === 'summary' ? <>
        <p>You’ve practiced watching and guessing. Replay is available whenever you need another look. Your daily score and streak are unchanged.</p>
        <p>Practice points: <strong>{game.score}</strong> — not recorded.</p>
        <ColorGuide />
        <p>Hard Mode adds a 20-second timer and reduces replays from five to three. Choose it before starting a challenge.</p>
        <CyberButton variant="primary" onClick={onExit}>{returnLabel}</CyberButton>
      </> : <>
        <p id="tutorial-guidance" className="tutorial-guidance" role="status" aria-live="polite" aria-atomic="true">{guidance}</p>
        <p className={stage === 'guessing' && game.attempts > 1 ? 'tutorial-feedback' : 'sr-only'} role="status" aria-live="polite" aria-atomic="true">{outcome}</p>
        <AttemptsDisplay results={game.attemptResults} currentAttempt={game.attempts} />
        <WordOutput word={game.currentWord} isRevealed={stage === 'result'}
          showLetters={game.showLetters && (stage === 'flashing' || stage === 'guessing')}
          animationTrigger={game.animationTrigger} onAnimationComplete={watched}
          startCountdown={stage === 'countdown' ? countdown : null} />
        {stage === 'countdown' && <p className="letter-hint tutorial-length">({game.currentWord.length} letters)</p>}
        {stage === 'result' ? <>
          <p className="tutorial-points">Practice points: <strong>{game.wordScores[game.wordIndex]}</strong></p>
          <p className="tutorial-scoring">Solving earlier and keeping replays earns more points. Clean first-try solves can also earn a streak bonus. These practice points aren’t recorded.</p>
          <CyberButton variant="primary" onClick={() => send({ type: game.wordIndex === 0 ? 'next' : 'finish' })}
            id="tutorial-continue">{game.wordIndex === 0 ? 'NEXT PRACTICE WORD' : 'FINISH PRACTICE'}</CyberButton>
        </> : <div className="action-grid">
          <CyberButton id="start-game" variant="primary" disabled={stage !== 'ready'} onClick={() => send({ type: 'watch' })}>WATCH LETTERS</CyberButton>
          <CyberButton variant="secondary" disabled={!['flashing', 'guessing'].includes(stage) || game.replayCount >= 5}
            onClick={() => send({ type: 'replay' })}
            onPointerDown={event => { if (document.activeElement?.id === 'user-input') event.preventDefault(); }}>REPLAY ({5 - game.replayCount})</CyberButton>
        </div>}
        <InputZone onSubmit={submit} disabled={inputDisabled} errorMessage={error} onErrorClear={() => setError(null)}
          wordIndex={game.wordIndex} modalOpen={help || contact} guidanceId="tutorial-guidance" />
      </>}
    </section>
    <ProgressTrack totalWords={2} currentWordIndex={summary ? 2 : game.wordIndex} wordResults={game.wordResults} cumulativeScores={game.wordScores} />
    <InstructionsModal isOpen={help} onClose={() => setHelp(false)} />
    <ContactModal isOpen={contact} onClose={() => setContact(false)} />
  </GameContainer>;
}
