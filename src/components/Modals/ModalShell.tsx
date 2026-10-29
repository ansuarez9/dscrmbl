import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  id?: string;
  className?: string;
  dismissOnBackdrop?: boolean;
  children: ReactNode;
}

const focusable = 'button, input, select, textarea, a[href], summary, [tabindex]';
function available(element: HTMLElement) {
  for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
    const style = getComputedStyle(ancestor);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
  }
  return !element.matches(':disabled, [hidden], [tabindex="-1"]') &&
    !element.closest('[hidden], [inert], [aria-hidden="true"], details:not([open]) > :not(summary)');
}

function restoreFocus(opener: HTMLElement | null) {
  if (document.querySelector('[role="dialog"]')) return;
  const fallback = ['#user-input:not(:disabled)', '#view-results', '#start-game:not(:disabled)', '#instructions']
    .map(selector => document.querySelector<HTMLElement>(selector)).find(element => element && available(element));
  const target = opener?.isConnected && available(opener) && opener !== document.body ? opener : fallback;
  target?.focus({ preventScroll: true });
}

/** Keep the background isolated through the exit transition. */
export function ModalShell({ isOpen, onClose, labelledBy, describedBy, id, className = '', dismissOnBackdrop = false, children }: ModalShellProps) {
  const reducedMotion = useReducedMotion();
  const [present, setPresent] = useState(isOpen);
  const dialogRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const mounted = isOpen || present;

  useEffect(() => {
    if (isOpen) { setPresent(true); return; }
    if (!present) return;
    if (reducedMotion) { setPresent(false); return; }
    const timer = window.setTimeout(() => setPresent(false), 250);
    return () => clearTimeout(timer);
  }, [isOpen, present, reducedMotion]);

  useLayoutEffect(() => {
    if (!mounted) return;
    // Strict Mode replays effects while the dialog still owns focus.
    if (!dialogRef.current?.contains(document.activeElement)) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    const previousOverflow = document.body.style.overflow;
    const siblings = Array.from(document.body.children).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== overlayRef.current
    );
    const previous = siblings.map(element => ({ element, inert: element.inert, hidden: element.getAttribute('aria-hidden') }));
    dialogRef.current?.focus({ preventScroll: true });
    siblings.forEach(element => { element.inert = true; element.setAttribute('aria-hidden', 'true'); });
    document.body.style.overflow = 'hidden';
    const containFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialogRef.current?.contains(event.target)) dialogRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener('focusin', containFocus);
    return () => {
      document.removeEventListener('focusin', containFocus);
      document.body.style.overflow = previousOverflow;
      previous.forEach(({ element, inert, hidden }) => {
        element.inert = inert;
        if (hidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', hidden);
      });
    };
  }, [mounted]);

  // Restore after React has committed replacement screens (e.g. the completed daily).
  useEffect(() => {
    if (!mounted) return;
    const opener = openerRef.current;
    return () => restoreFocus(opener);
  }, [mounted]);

  if (!mounted) return null;
  return createPortal(
    <div ref={overlayRef} id={id} className={`modal-overlay ${isOpen ? 'show-modal' : 'hide-modal'}`}
      onClick={event => { if (isOpen && dismissOnBackdrop && event.target === event.currentTarget) closeRef.current(); }}>
      <div ref={dialogRef} className={`modal-container ${className}`} role="dialog" aria-modal="true"
        aria-labelledby={labelledBy} aria-describedby={describedBy} tabIndex={-1} onKeyDown={event => {
          if (event.key === 'Escape') {
            event.preventDefault(); event.stopPropagation();
            if (isOpen) closeRef.current();
          }
          if (event.key !== 'Tab') return;
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(focusable)).filter(available);
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (!first) { event.preventDefault(); event.currentTarget.focus(); }
          else if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
            event.preventDefault(); last.focus();
          } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) {
            event.preventDefault(); first.focus();
          }
        }}>
        {children}
      </div>
    </div>, document.body
  );
}
