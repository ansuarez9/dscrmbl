import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';

interface InputZoneProps {
  onSubmit: (guess: string) => void;
  disabled: boolean;
  buttonText?: string;
}

export function InputZone({ onSubmit, disabled, buttonText = 'SUBMIT' }: InputZoneProps) {
  const [value, setValue] = useState('');
  const [showError, setShowError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [disabled]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();

    if (!value.trim()) {
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
      return;
    }

    onSubmit(value.trim());
    setValue('');
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="input-zone">
      <div className="input-wrapper">
        <span className="input-prefix">&gt;</span>
        <input
          ref={inputRef}
          className="cyber-input"
          id="user-input"
          type="text"
          placeholder="ENTER GUESS..."
          autoComplete="off"
          spellCheck="false"
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          onKeyPress={handleKeyPress}
          disabled={disabled}
        />
        <button
          type="button"
          id="submit-action"
          className="submit-btn"
          disabled={disabled}
          onClick={() => handleSubmit()}
        >
          <span className="submit-text">{buttonText}</span>
          <span className="submit-arrow">{String.fromCharCode(0x2192)}</span>
        </button>
      </div>
      <p className={`error-message ${showError ? 'fade-out' : ''}`}>
        Press <strong id="button-text">{buttonText}</strong> or enter a guess!
      </p>
    </div>
  );
}
