import { useCallback, useEffect, useState } from 'react';
import { localDateKey } from '../utils/localDate';

export function useLocalDay(): string {
  const [day, setDay] = useState(() => localDateKey());
  const reconcile = useCallback(() => setDay(current => {
    const actual = localDateKey();
    return current === actual ? current : actual;
  }), []);

  useEffect(() => {
    reconcile();
    const interval = window.setInterval(reconcile, 1000);
    document.addEventListener('visibilitychange', reconcile);
    window.addEventListener('focus', reconcile);
    window.addEventListener('pageshow', reconcile);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', reconcile);
      window.removeEventListener('focus', reconcile);
      window.removeEventListener('pageshow', reconcile);
    };
  }, [reconcile]);
  return day;
}
