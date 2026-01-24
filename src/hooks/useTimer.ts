import { useState, useRef, useCallback, useEffect } from 'react';

interface UseTimerOptions {
  initialTime?: number;
  onWarning?: () => void;
  onExpire?: () => void;
  warningThreshold?: number;
}

export function useTimer(options: UseTimerOptions = {}) {
  const {
    initialTime = 30,
    onWarning,
    onExpire,
    warningThreshold = 10
  } = options;

  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const hasWarnedRef = useRef(false);
  const hasExpiredRef = useRef(false);

  // Use refs for callbacks to prevent startTimer from being recreated
  const onWarningRef = useRef(onWarning);
  const onExpireRef = useRef(onExpire);

  // Keep refs updated
  useEffect(() => {
    onWarningRef.current = onWarning;
    onExpireRef.current = onExpire;
  }, [onWarning, onExpire]);

  // Clear the interval
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopTimer = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setIsWarning(false);
    hasWarnedRef.current = false;
    hasExpiredRef.current = false;
  }, [clearTimer]);

  const startTimer = useCallback(() => {
    clearTimer();
    setTimeRemaining(initialTime);
    setIsRunning(true);
    setIsWarning(false);
    hasWarnedRef.current = false;
    hasExpiredRef.current = false;

    intervalRef.current = window.setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);
  }, [initialTime, clearTimer]);

  // Handle warning and expiration based on timeRemaining changes
  useEffect(() => {
    if (!isRunning) return;

    if (timeRemaining === warningThreshold && !hasWarnedRef.current) {
      hasWarnedRef.current = true;
      setIsWarning(true);
      onWarningRef.current?.();
    }

    if (timeRemaining <= 0 && !hasExpiredRef.current) {
      hasExpiredRef.current = true;
      clearTimer();
      setIsRunning(false);
      setIsWarning(false);
      onExpireRef.current?.();
    }
  }, [timeRemaining, isRunning, warningThreshold, clearTimer]);

  const resetTimer = useCallback(() => {
    stopTimer();
    setTimeRemaining(initialTime);
  }, [initialTime, stopTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    timeRemaining,
    isRunning,
    isWarning,
    startTimer,
    stopTimer,
    resetTimer
  };
}
