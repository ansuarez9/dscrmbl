import { useCallback, useEffect, useReducer } from 'react';
import { gameReducer, initialState } from '../utils/gameEngine';
import type { DailyTheme, GameState } from '../types/game';

export const TUTORIAL_KEY = 'dscrmbl-tutorial-v1';
export const tutorialTheme: DailyTheme = {
  themeName: 'TUTORIAL PRACTICE', description: 'Two short words. No daily score or streak changes.', wordList: ['cat', 'sun']
};
export type TutorialStage = 'ready' | 'countdown' | 'flashing' | 'guessing' | 'result';
export type TutorialRun = { game: GameState; stage: TutorialStage };
export type TutorialRecord = { version: 1; invitationHandled: boolean; completed: boolean; run: TutorialRun | null };
export type TutorialBoot = { record: TutorialRecord; invite: boolean };

type Controller = { record: TutorialRecord; active: boolean; invitation: boolean; summary: GameState | null };
type Action = { type: 'dismiss' | 'start' | 'resume' | 'exit' | 'watch' | 'flash' | 'watched' | 'replay' | 'next' | 'finish' } |
  { type: 'guess'; guess: string; submittedAt: number };

function restoreRun(run: TutorialRun): TutorialRun {
  return { game: { ...run.game, showLetters: false },
    stage: run.stage === 'countdown' ? 'ready' : run.stage === 'flashing' ? 'guessing' : run.stage };
}

function validRun(value: unknown): value is TutorialRun {
  if (!value || typeof value !== 'object') return false;
  const { game: g, stage } = value as TutorialRun;
  if (!g || typeof g !== 'object' || !['ready', 'countdown', 'flashing', 'guessing', 'result'].includes(stage)) return false;
  if (![0, 1].includes(g.wordIndex) || ![1, 2, 3].includes(g.attempts) || !Number.isInteger(g.replayCount) || g.replayCount < 0 || g.replayCount > 5) return false;
  if (g.hardModeEnabled !== false || g.timerModeEnabled !== false || g.isDailyChallenge !== false || g.wordDeadline !== null) return false;
  if (g.phase !== (stage === 'result' ? 'revealing' : 'playing')) return false;
  if (g.currentWord !== tutorialTheme.wordList[g.wordIndex].toUpperCase() ||
    JSON.stringify(g.playableWords) !== JSON.stringify(tutorialTheme.wordList.slice(g.wordIndex + 1))) return false;
  const count = g.wordIndex + (stage === 'result' ? 1 : 0);
  if (!Array.isArray(g.wordResults) || g.wordResults.length !== count || !g.wordResults.every(r => r && typeof r.solved === 'boolean' && typeof r.usedReplay === 'boolean' &&
    Number.isInteger(r.attempts) && (r.solved ? r.attempts >= 1 && r.attempts <= 3 : r.attempts === 4))) return false;
  if (!Array.isArray(g.wordScores) || g.wordScores.length !== count || !g.wordScores.every(n => Number.isFinite(n) && n >= 0)) return false;
  if (!Array.isArray(g.attemptResults) || g.attemptResults.length !== 3 || !g.attemptResults.every(r => ['pending', 'wrong', 'correct'].includes(r))) return false;
  if (![g.score, g.streak, g.streakBonus, g.animationTrigger].every(n => Number.isFinite(n) && n >= 0)) return false;
  return typeof g.showLetters === 'boolean';
}

/** Read before mounting GameProvider: its initializer may clean up an old save. */
export function loadTutorialBoot(): TutorialBoot {
  let record: TutorialRecord = { version: 1, invitationHandled: false, completed: false, run: null };
  let returning = false;
  try {
    returning = !!localStorage.getItem('dscrmbl-seen-instructions') ||
      !!localStorage.getItem('dscrmbl-game-state') || !!localStorage.getItem('dscrmbl-daily');
    const raw = localStorage.getItem(TUTORIAL_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        record = { version: 1, invitationHandled: saved?.invitationHandled === true, completed: saved?.completed === true,
          run: saved?.version === 1 && validRun(saved.run) ? restoreRun({ ...saved.run,
            game: { ...saved.run.game, roundTheme: tutorialTheme, roundDate: null } }) : null };
      } catch { record.invitationHandled = true; }
    }
  } catch { /* Storage may be blocked; the tutorial still works for this visit. */ }
  const invite = !returning && !record.invitationHandled && !record.completed && !record.run;
  return { record: { ...record, invitationHandled: true }, invite };
}

function freshRun(): TutorialRun {
  return { game: gameReducer(initialState, { type: 'START_GAME', theme: tutorialTheme, isDailyChallenge: false,
    initialStreak: 0, roundDate: null }), stage: 'ready' };
}

function reducer(state: Controller, action: Action): Controller {
  const run = state.record.run;
  const update = (next: TutorialRun): Controller => ({ ...state, record: { ...state.record, run: next } });
  switch (action.type) {
    case 'dismiss': return { ...state, invitation: false };
    case 'start': return { ...state, active: true, invitation: false, summary: null, record: { ...state.record, run: freshRun() } };
    case 'resume': return run ? { ...state, active: true, invitation: false, summary: null, record: { ...state.record, run: restoreRun(run) } } : state;
    case 'exit': return { ...state, active: false, summary: null, record: { ...state.record, run: run ? restoreRun(run) : null } };
    case 'watch': return run?.stage === 'ready' ? update({ ...run, stage: 'countdown' }) : state;
    case 'flash': return run?.stage === 'countdown' ? update({ stage: 'flashing', game: gameReducer(run.game,
      { type: 'START_WORD_TIMER', wordIndex: run.game.wordIndex, startedAt: Date.now() }) }) : state;
    case 'watched': return run?.stage === 'flashing' ? update({ ...run, stage: 'guessing' }) : state;
    case 'guess': {
      if (!run || !['guessing', 'flashing'].includes(run.stage)) return state;
      const game = gameReducer(run.game, { type: 'SUBMIT_GUESS', guess: action.guess, submittedAt: action.submittedAt });
      return update({ game, stage: game.phase === 'revealing' ? 'result' : 'guessing' });
    }
    case 'replay': return run && ['guessing', 'flashing'].includes(run.stage) && run.game.replayCount < 5
      ? update({ game: gameReducer(run.game, { type: 'REPLAY_WORD' }), stage: 'flashing' }) : state;
    case 'next': return run?.stage === 'result' && run.game.playableWords.length > 0
      ? update({ game: { ...gameReducer(run.game, { type: 'NEXT_WORD', startedAt: Date.now() }), showLetters: false }, stage: 'ready' }) : state;
    case 'finish': return run?.stage === 'result' && run.game.playableWords.length === 0
      ? { ...state, summary: gameReducer(run.game, { type: 'NEXT_WORD', startedAt: Date.now() }),
        record: { ...state.record, completed: true, run: null } } : state;
  }
}

export function useTutorial(boot: TutorialBoot) {
  const [state, dispatch] = useReducer(reducer, boot, initial => ({ record: initial.record, active: false, invitation: initial.invite, summary: null }));
  useEffect(() => {
    try { localStorage.setItem(TUTORIAL_KEY, JSON.stringify(state.record)); } catch { /* Session-only progress. */ }
  }, [state.record]);
  const send = useCallback((action: Action) => dispatch(action), []);
  return { ...state, send };
}
