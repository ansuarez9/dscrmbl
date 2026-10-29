import type { InputHTMLAttributes } from 'react';

interface ToggleSwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export function ToggleSwitch({ label, id, ...props }: ToggleSwitchProps) {
  return (
    <div className="setting-item">
      {label && <label className="setting-label" htmlFor={id}>{label}</label>}
      <label className="cyber-toggle" aria-label={label ? undefined : props['aria-label']}>
        <input type="checkbox" id={id} {...props} />
        <span className="toggle-track">
          <span className="toggle-thumb"></span>
        </span>
      </label>
    </div>
  );
}
