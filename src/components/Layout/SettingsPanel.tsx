import { ToggleSwitch } from '../Buttons/ToggleSwitch';

interface SettingsPanelProps {
  timerModeEnabled: boolean;
  onTimerModeToggle: () => void;
}

export function SettingsPanel({ timerModeEnabled, onTimerModeToggle }: SettingsPanelProps) {
  return (
    <div className="settings-panel">
      <ToggleSwitch
        label="TIMER MODE"
        id="timer-mode-toggle"
        checked={timerModeEnabled}
        onChange={onTimerModeToggle}
      />
    </div>
  );
}
