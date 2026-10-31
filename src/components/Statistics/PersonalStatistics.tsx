import { useEffect, useRef } from 'react';
import type { DailyStats } from '../../types/game';
import { progressSummary, wordCounts } from '../../utils/progress';

export function LifetimeSummary({ stats, currentStreak }: { stats: DailyStats | null; currentStreak: number }) {
  return <section aria-label="Lifetime statistics" className="lifetime-summary">
    <h3>Lifetime statistics</h3>
    <p className="statistics-note">All recorded daily games, across all modes.</p>
    <div className="stats-grid">
      {[
        ['GAMES', stats?.gamesPlayed ?? 0, 'gamesPlayed'],
        ['HIGH', stats?.highScore ?? 0, 'highScore'],
        ['AVG', Math.round(stats?.average ?? 0), 'averageScore'],
        ['CURRENT STREAK', currentStreak, 'currentStreak']
      ].map(([label, value, id]) => <div className="stat-card" key={id}>
        <span className="stat-label">{label}</span><span className="stat-value" id={String(id)}>{value}</span>
      </div>)}
    </div>
    <p className="statistics-note">Streak counts consecutive first-guess word solves without Replay.</p>
  </section>;
}

function rate(count: number, total: number) {
  return total ? `${Math.round(count / total * 100)}% — ${count} of ${total} words` : '— (no tracked words)';
}

export function YourProgress({ stats, isOpen }: { stats: DailyStats | null; isOpen: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (isOpen && ref.current) ref.current.open = false; }, [isOpen]);
  const summary = progressSummary(stats?.progress);
  return <details className="your-progress" ref={ref}>
    <summary>Your Progress</summary>
    {summary.trackedSince ? <>
      <p>Tracked since <time dateTime={summary.trackedSince}>{summary.trackedSince}</time>. Older lifetime games are excluded from detailed progress.</p>
      <div className="mode-statistics">
        {summary.modes.map(mode => <section key={mode.mode} aria-label={`${mode.mode === 'hard' ? 'Hard' : 'Normal'} Mode progress`}>
          <h3>{mode.mode === 'hard' ? 'Hard' : 'Normal'} Mode</h3>
          {!mode.games && <p>No tracked games</p>}
          <dl>
            <div><dt>Tracked games</dt><dd>{mode.games}</dd></div>
            <div><dt>High score</dt><dd>{mode.high ?? '—'}</dd></div>
            <div><dt>Average score</dt><dd>{mode.average ?? '—'}</dd></div>
            <div><dt>Word solve rate</dt><dd>{rate(mode.solved, mode.total)}</dd></div>
            <div><dt>First-try accuracy</dt><dd>{rate(mode.firstTry, mode.total)}</dd></div>
          </dl>
        </section>)}
      </div>
      <p className="statistics-note">Rates use all tracked daily games in each mode, including missed words and timeouts. First-try accuracy counts words solved on the first guess without Replay.</p>
      <h3>Recent daily results</h3>
      <p className="statistics-note">Latest 10 tracked challenges.</p>
      <ol className="recent-results">
        {summary.recent.map(record => {
          const counts = wordCounts(record.wordResults);
          return <li key={record.challengeDate}>
            <div><time dateTime={record.challengeDate}>{record.challengeDate}</time> · {record.mode === 'hard' ? 'Hard' : 'Normal'} Mode</div>
            <div>Score: {record.score} · Solved: {counts.solved}/5 · First try without Replay: {counts.firstTry}/5</div>
          </li>;
        })}
      </ol>
    </> : <p>No daily progress tracked yet. Older games remain in your lifetime statistics.</p>}
    <p className="statistics-note">History stays in this browser on this device, with no backup or sync. Clearing site data removes it. Browser storage is limited; if saving fails, progress is available for this session only.</p>
  </details>;
}
