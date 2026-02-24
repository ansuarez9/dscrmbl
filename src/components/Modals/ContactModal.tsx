import { useEffect, useState } from 'react';
import { CyberButton } from '../Buttons/CyberButton';

type RequestType = 'theme' | 'bug' | 'feedback';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Sign up at https://formspree.io and replace with your form ID
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mpqjolvw';

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>('theme');
  const [email, setEmail] = useState('');
  const [themeName, setThemeName] = useState('');
  const [exampleWords, setExampleWords] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsHiding(false);
    } else if (isVisible) {
      setIsHiding(true);
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setIsHiding(false);
      }, 250);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, isVisible]);

  const resetForm = () => {
    setRequestType('theme');
    setEmail('');
    setThemeName('');
    setExampleWords('');
    setPreferredDate('');
    setMessage('');
    setStatus('idle');
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetForm, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

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

      if (response.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (!isVisible) return null;

  const overlayClass = `modal-overlay ${isHiding ? 'hide-modal' : 'show-modal'}`;
  const today = new Date().toISOString().split('T')[0];

  const typeLabels: Record<RequestType, string> = {
    theme: 'THEME REQUEST',
    bug: 'BUG REPORT',
    feedback: 'FEEDBACK',
  };

  return (
    <div className={overlayClass}>
      <div className="modal-container">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">// CONTACT</h2>
            <div className="modal-decoration"></div>
          </div>
          <button className="modal-close-btn" onClick={handleClose} aria-label="Close contact form">
            ✕
          </button>
        </div>

        <div className="modal-content">
          {status === 'success' ? (
            <div className="contact-success">
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
            <form onSubmit={handleSubmit} className="contact-form" noValidate>
              {/* Request type selector */}
              <div className="contact-field">
                <label className="contact-label">REQUEST TYPE</label>
                <div className="contact-type-grid">
                  {(['theme', 'bug', 'feedback'] as RequestType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`contact-type-btn${requestType === type ? ' contact-type-btn--active' : ''}`}
                      onClick={() => setRequestType(type)}
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
                  id="contact-email"
                  type="email"
                  className="contact-input"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              {status === 'error' && (
                <p className="contact-error">
                  {String.fromCodePoint(0x26a0)} Failed to send. Please try again.
                </p>
              )}

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
      </div>
    </div>
  );
}
