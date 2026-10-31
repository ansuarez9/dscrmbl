import { useState, useRef, useEffect, type FormEvent } from 'react';

interface InputZoneProps {
  onSubmit: (guess: string) => boolean | void;
  disabled: boolean;
  buttonText?: string;
  errorMessage?: string | null;
  onErrorClear?: () => void;
  wordIndex?: number;
  modalOpen?: boolean;
  guidanceId?: string;
}

export function InputZone({ onSubmit, disabled, buttonText = 'SUBMIT', errorMessage, onErrorClear, wordIndex, modalOpen = false, guidanceId }: InputZoneProps) {
  const [value, setValue] = useState('');
  const [emptyError, setEmptyError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const needsFocus = useRef(!disabled);
  const previousDisabled = useRef(disabled);
  const error = errorMessage || (emptyError ? 'Enter a guess first.' : '');

  useEffect(() => { setValue(''); setEmptyError(false); }, [wordIndex]);

  useEffect(() => {
    if (previousDisabled.current !== disabled) {
      needsFocus.current = !disabled;
      previousDisabled.current = disabled;
    }
    if (disabled || modalOpen) { needsFocus.current = false; return; }
    if (!needsFocus.current) return;
    const timer = window.setTimeout(() => {
      needsFocus.current = false;
      if (!document.querySelector('[role="dialog"]')) inputRef.current?.focus({ preventScroll: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [disabled, modalOpen]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    setEmptyError(false);
    onErrorClear?.();
    if (!value.trim()) { setEmptyError(true); return; }
    if (onSubmit(value.trim()) !== false) setValue('');
  };

  return (
    <form className="input-zone" onSubmit={handleSubmit} aria-label="Guess the word">
      <label className="sr-only" htmlFor="user-input">Your guess</label>
      <div className="input-wrapper">
        <span className="input-prefix" aria-hidden="true">&gt;</span>
        <input ref={inputRef} className="cyber-input" id="user-input" type="text"
          placeholder="ENTER GUESS..." autoComplete="off" autoCorrect="off" autoCapitalize="characters"
          spellCheck={false} enterKeyHint="go" value={value} disabled={disabled}
          aria-describedby={`guess-instructions${guidanceId ? ` ${guidanceId}` : ''}${error ? ' guess-error' : ''}`} aria-invalid={!!error}
          onChange={event => { setValue(event.target.value.toUpperCase()); setEmptyError(false); onErrorClear?.(); }} />
        <button type="submit" id="submit-action" className="submit-btn" disabled={disabled} aria-label={buttonText}
          onPointerDown={event => { if (document.activeElement === inputRef.current) event.preventDefault(); }}>
          <span className="submit-text">{buttonText}</span>
          <span className="submit-arrow" aria-hidden="true">→</span>
        </button>
      </div>
      <p id="guess-instructions" className="guess-instructions">Type a word, then press Enter or Submit.</p>
      <p id="guess-error" className="guess-error" role="status" aria-live="polite" aria-atomic="true">{error}</p>
    </form>
  );
}
