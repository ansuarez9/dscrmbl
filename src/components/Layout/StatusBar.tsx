interface StatusBarProps {
  timeRemaining: number;
  isTimerVisible: boolean;
  isTimerWarning: boolean;
  streak: number;
  replaysRemaining?: number;
  showReplays?: boolean;
}

export function StatusBar({ timeRemaining, isTimerVisible, isTimerWarning, streak, replaysRemaining = 0, showReplays = false }: StatusBarProps) {
  const timerClass = isTimerWarning
    ? 'status-item status-item--timer timer-warning'
    : 'status-item status-item--timer';

  return (
    <div className="status-bar">
      {isTimerVisible && (
        <div id="timer-display" className={timerClass} role="timer" aria-label="Time remaining" aria-live="off">
          <span className="status-icon" aria-hidden="true">{String.fromCodePoint(0x23F1)}</span>
          <span className="status-value">{timeRemaining}s</span>
        </div>
      )}
      {showReplays && (
        <div id="replay-display" className="status-item status-item--replays">
          <span className="status-icon" aria-hidden="true">{String.fromCodePoint(0x1F504)}</span>
          <span className="status-value">{replaysRemaining}</span>
        </div>
      )}
      <div id="streak-display" className="status-item status-item--streak" aria-label={`Streak: ${streak}`}>
        <span className="status-icon" aria-hidden="true">{String.fromCodePoint(0x1F525)}</span>
        <span className="status-value">{streak}</span>
      </div>
    </div>
  );
}
