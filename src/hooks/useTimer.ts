import { useState, useRef, useEffect } from 'react';

interface UseTimerOptions {
  deadline: number | null;
  initialTime?: number;
  onWarning?: () => void;
  onExpire?: (deadline: number) => void;
  warningThreshold?: number;
}

function secondsUntil(deadline: number | null, initialTime: number): number {
  return deadline === null ? initialTime : Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

export function useTimer({ deadline, initialTime = 20, onWarning, onExpire, warningThreshold = 10 }: UseTimerOptions) {
  const [timeRemaining, setTimeRemaining] = useState(() => secondsUntil(deadline, initialTime));
  const handledDeadlineRef = useRef<number | null>(null);
  const hasWarnedRef = useRef(false);
  const hasExpiredRef = useRef(false);
  const onWarningRef = useRef(onWarning);
  const onExpireRef = useRef(onExpire);

  onWarningRef.current = onWarning;
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (handledDeadlineRef.current !== deadline) {
      handledDeadlineRef.current = deadline;
      hasWarnedRef.current = false;
      hasExpiredRef.current = false;
    }

    const update = () => {
      const remaining = secondsUntil(deadline, initialTime);
      setTimeRemaining(remaining);
      if (deadline === null) return;

      if (remaining === 0) {
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true;
          onExpireRef.current?.(deadline);
        }
      } else if (remaining <= warningThreshold && !hasWarnedRef.current) {
        hasWarnedRef.current = true;
        onWarningRef.current?.();
      }
    };

    update();
    if (deadline === null) return;

    const interval = window.setInterval(update, 250);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('pageshow', update);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('pageshow', update);
    };
  }, [deadline, initialTime, warningThreshold]);

  return {
    timeRemaining,
    isRunning: deadline !== null && timeRemaining > 0,
    isWarning: deadline !== null && timeRemaining > 0 && timeRemaining <= warningThreshold
  };
}
