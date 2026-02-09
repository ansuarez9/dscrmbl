import { ToggleSwitch } from '../Buttons/ToggleSwitch';

interface SettingsPanelProps {
  hardModeEnabled: boolean;
  onHardModeToggle: () => void;
  timeRemaining?: number;
  isTimerVisible?: boolean;
  isTimerWarning?: boolean;
  streak?: number;
}

export function SettingsPanel({
  hardModeEnabled,
  onHardModeToggle,
  timeRemaining = 0,
  isTimerVisible = false,
  isTimerWarning = false,
  streak = 0
}: SettingsPanelProps) {
  const timerClass = isTimerWarning
    ? 'status-item status-item--timer timer-warning'
    : 'status-item status-item--timer';

  return (
    <div className="settings-panel">
      <ToggleSwitch
        label="HARD MODE"
        id="hard-mode-toggle"
        checked={hardModeEnabled}
        onChange={onHardModeToggle}
      />
      <div className="settings-status">
        {isTimerVisible && (
          <div className={timerClass}>
            <span className="status-icon">{String.fromCodePoint(0x23F1)}</span>
            <span className="status-value">{timeRemaining}s</span>
          </div>
        )}
        <div className="status-item status-item--streak">
          <span className="status-icon">{String.fromCodePoint(0x1F525)}</span>
          <span className="status-value">{streak}</span>
        </div>
      </div>
    </div>
  );
}
