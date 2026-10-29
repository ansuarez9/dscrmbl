import { useEffect, useRef, useState } from 'react';
import { ModalShell } from './ModalShell';
import { CyberButton } from '../Buttons/CyberButton';

type RequestType = 'theme' | 'bug' | 'feedback';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Sign up at https://formspree.io and replace with your form ID
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mpqjolvw';

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [requestType, setRequestType] = useState<RequestType>('theme');
  const [email, setEmail] = useState('');
  const [themeName, setThemeName] = useState('');
  const [exampleWords, setExampleWords] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const resetForm = () => {
    setRequestType('theme');
    setEmail('');
    setThemeName('');
    setExampleWords('');
    setPreferredDate('');
    setMessage('');
    setStatus('idle');
  };

  const requestVersion = useRef(0);
  const [validation, setValidation] = useState('');
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  useEffect(() => {
    if (isOpen) { resetForm(); setValidation(''); setInvalidFields([]); }
    return () => { requestVersion.current++; };
  }, [isOpen]);
  const handleClose = onClose;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === 'sending') return;
    const form = e.currentTarget;
    if (!form.checkValidity() || (requestType === 'theme' ? !themeName.trim() : !message.trim())) {
      setValidation('Complete the required fields and enter a valid email, or leave email blank.');
      const fields = Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input:invalid, textarea:invalid')).map(field => field.id);
      const requiredText = requestType === 'theme' ? 'theme-name' : 'contact-message';
      if (!(requestType === 'theme' ? themeName : message).trim() && !fields.includes(requiredText)) fields.push(requiredText);
      setInvalidFields(fields);
      const invalid = document.getElementById(fields[0]);
      invalid?.focus();
      return;
    }
    setValidation('');
    setStatus('sending');
    const version = ++requestVersion.current;

    const payload = {
      _subject: `DSCRMBL — ${requestType.toUpperCase()} from ${email || 'anonymous'}`,
      type: requestType,
      ...(email && { email }),
      ...(requestType === 'theme' && {
        theme_name: themeName,
        example_words: exampleWords || 'none provided',
        preferred_date: preferredDate || 'any',
      }),
      message: message || '(no message)',
    };

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });

      if (version !== requestVersion.current) return;
      if (response.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      if (version === requestVersion.current) setStatus('error');
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const typeLabels: Record<RequestType, string> = {
    theme: 'THEME REQUEST',
    bug: 'BUG REPORT',
    feedback: 'FEEDBACK',
  };

  return (
    <ModalShell id="contact-modal" isOpen={isOpen} onClose={handleClose} labelledBy="contact-title">
        <div className="modal-header">
          <div>
            <h2 id="contact-title" className="modal-title">// CONTACT</h2>
            <div className="modal-decoration"></div>
          </div>
          <button className="modal-close-btn" onClick={handleClose} aria-label="Close contact form">
            ✕
          </button>
        </div>

        <div className="modal-content">
          {status === 'success' ? (
            <div className="contact-success" role="status" tabIndex={-1} ref={element => { if (element) element.focus(); }}>
              <div className="contact-success-icon">{String.fromCodePoint(0x2713)}</div>
              <p className="contact-success-title">MESSAGE SENT!</p>
              <p className="contact-success-sub">
                Thanks for reaching out — I read every message and will get back to you if you
                left an email.
              </p>
              <CyberButton variant="secondary" onClick={handleClose}>
                CLOSE
              </CyberButton>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form" noValidate aria-describedby="contact-feedback">
              {/* Request type selector */}
              <div className="contact-field">
                <span id="request-type-label" className="contact-label">REQUEST TYPE</span>
                <div className="contact-type-grid" role="group" aria-labelledby="request-type-label">
                  {(['theme', 'bug', 'feedback'] as RequestType[]).map((type) => (
                    <button
                      key={type}
                      aria-pressed={requestType === type}
                      type="button"
                      className={`contact-type-btn${requestType === type ? ' contact-type-btn--active' : ''}`}
                      onClick={() => { setRequestType(type); setValidation(''); }}
                    >
                      {typeLabels[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme-specific fields */}
              {requestType === 'theme' && (
                <>
                  <div className="contact-field">
                    <label className="contact-label" htmlFor="theme-name">
                      THEME NAME <span className="contact-required">*</span>
                    </label>
                    <input
                      aria-invalid={!!validation && invalidFields.includes('theme-name')} aria-describedby={validation ? "contact-feedback" : undefined}
                      id="theme-name"
                      type="text"
                      className="contact-input"
                      placeholder="e.g. SPACE EXPLORATION"
                      value={themeName}
                      onChange={(e) => setThemeName(e.target.value)}
                      required
                      maxLength={60}
                      autoComplete="off"
                    />
                  </div>

                  <div className="contact-field">
                    <label className="contact-label" htmlFor="example-words">
                      EXAMPLE WORDS{' '}
                      <span className="contact-hint">(comma-separated, 5+ words ideal)</span>
                    </label>
                    <input
                      id="example-words"
                      type="text"
                      className="contact-input"
                      placeholder="orbit, comet, galaxy, nebula, rover"
                      value={exampleWords}
                      onChange={(e) => setExampleWords(e.target.value)}
                      maxLength={200}
                      autoComplete="off"
                    />
                  </div>

                  <div className="contact-field">
                    <label className="contact-label" htmlFor="preferred-date">
                      PREFERRED DATE <span className="contact-hint">(optional)</span>
                    </label>
                    <input
                      aria-invalid={!!validation && invalidFields.includes('preferred-date')} aria-describedby={validation ? "contact-feedback" : undefined}
                      id="preferred-date"
                      type="date"
                      className="contact-input contact-input--date"
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      min={today}
                    />
                  </div>
                </>
              )}

              {/* Message */}
              <div className="contact-field">
                <label className="contact-label" htmlFor="contact-message">
                  {requestType === 'theme' && (
                    <>
                      ADDITIONAL NOTES <span className="contact-hint">(optional)</span>
                    </>
                  )}
                  {requestType === 'bug' && (
                    <>
                      DESCRIBE THE BUG <span className="contact-required">*</span>
                    </>
                  )}
                  {requestType === 'feedback' && (
                    <>
                      YOUR MESSAGE <span className="contact-required">*</span>
                    </>
                  )}
                </label>
                <div className="contact-textarea-wrap">
                  <textarea
                    aria-invalid={!!validation && invalidFields.includes('contact-message')} aria-describedby={validation ? "contact-feedback" : undefined}
                    id="contact-message"
                    className="contact-textarea"
                    placeholder={
                      requestType === 'theme'
                        ? 'Any extra context about the theme or its connection to a date...'
                        : requestType === 'bug'
                          ? 'What happened? What did you expect to happen?'
                          : 'Share your thoughts, suggestions, or ideas...'
                    }
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required={requestType !== 'theme'}
                    rows={4}
                    maxLength={1000}
                  />
                  <span className="contact-char-count">{message.length} / 1000</span>
                </div>
              </div>

              {/* Email */}
              <div className="contact-field">
                <label className="contact-label" htmlFor="contact-email">
                  YOUR EMAIL <span className="contact-hint">(optional — for replies)</span>
                </label>
                <input
                  aria-invalid={!!validation && invalidFields.includes('contact-email')} aria-describedby={validation ? "contact-feedback" : undefined}
                  id="contact-email"
                  type="email"
                  className="contact-input"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <p id="contact-feedback" className="contact-error" role="status" aria-live="polite" aria-atomic="true">
                {validation || (status === 'sending' ? 'Sending message…' : status === 'error' ? 'Failed to send. Please try again.' : '')}
              </p>

              <CyberButton
                type="submit"
                variant="primary"
                tag={String.fromCodePoint(0x2192)}
                disabled={status === 'sending'}
              >
                {status === 'sending' ? 'SENDING...' : 'SEND MESSAGE'}
              </CyberButton>
            </form>
          )}
        </div>
    </ModalShell>
  );
}
