import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';

interface InputZoneProps {
  onSubmit: (guess: string) => void;
  disabled: boolean;
  buttonText?: string;
  errorMessage?: string | null;
  onErrorClear?: () => void;
}

export function InputZone({ onSubmit, disabled, buttonText = 'SUBMIT', errorMessage, onErrorClear }: InputZoneProps) {
  const [value, setValue] = useState('');
  const [showError, setShowError] = useState(false);
  const [showShake, setShowShake] = useState(false);
  const [showFloatingMessage, setShowFloatingMessage] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!disabled && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [disabled]);

  useEffect(() => {
    if (errorMessage) {
      setShowShake(true);
      setShowFloatingMessage(true);
      const timeout = setTimeout(() => {
        onErrorClear?.();
        setShowShake(false);
        setShowFloatingMessage(false);
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [errorMessage, onErrorClear]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();

    if (!value.trim()) {
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
      return;
    }

    onSubmit(value.trim());
    setValue('');

    // Hide mobile keyboard after submission
    inputRef.current?.blur();
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="input-zone">
      <div ref={wrapperRef} className={`input-wrapper ${showShake ? 'shake' : ''}`}>
        {showFloatingMessage && errorMessage && (
          <div className="floating-error-message">
            {errorMessage}
          </div>
        )}
        <span className="input-prefix">&gt;</span>
        <input
          ref={inputRef}
          className="cyber-input"
          id="user-input"
          type="text"
          placeholder="ENTER GUESS..."
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
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
      <p className={`error-message ${showError || errorMessage ? 'fade-out' : ''}`}>
        {errorMessage ?? <>Press <strong id="button-text">{buttonText}</strong> or enter a guess!</>}
      </p>
    </div>
  );
}
