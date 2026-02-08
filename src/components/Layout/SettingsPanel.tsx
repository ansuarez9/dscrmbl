import { ToggleSwitch } from '../Buttons/ToggleSwitch';

interface SettingsPanelProps {
  timerModeEnabled: boolean;
  hardModeEnabled: boolean;
  onTimerModeToggle: () => void;
  onHardModeToggle: () => void;
}

export function SettingsPanel({ timerModeEnabled, hardModeEnabled, onTimerModeToggle, onHardModeToggle }: SettingsPanelProps) {
  return (
    <div className="settings-panel">
      <ToggleSwitch
        label="HARD MODE"
        id="hard-mode-toggle"
        checked={hardModeEnabled}
        onChange={onHardModeToggle}
      />
      <ToggleSwitch
        label="TIMER MODE"
        id="timer-mode-toggle"
        checked={timerModeEnabled}
        onChange={onTimerModeToggle}
        disabled={hardModeEnabled}
      />
    </div>
  );
}
