import { ToggleSwitch } from '../Buttons/ToggleSwitch';

interface SettingsPanelProps {
  hardModeEnabled: boolean;
  onHardModeToggle: () => void;
}

export function SettingsPanel({ hardModeEnabled, onHardModeToggle }: SettingsPanelProps) {
  return (
    <div className="settings-panel">
      <ToggleSwitch
        label="HARD MODE"
        id="hard-mode-toggle"
        checked={hardModeEnabled}
        onChange={onHardModeToggle}
      />
    </div>
  );
}
