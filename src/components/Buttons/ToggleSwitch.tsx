import type { InputHTMLAttributes } from 'react';

interface ToggleSwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export function ToggleSwitch({ label, id, ...props }: ToggleSwitchProps) {
  return (
    <div className="setting-item">
      {label && <span className="setting-label">{label}</span>}
      <label className="cyber-toggle">
        <input type="checkbox" id={id} {...props} />
        <span className="toggle-track">
          <span className="toggle-thumb"></span>
        </span>
      </label>
    </div>
  );
}
