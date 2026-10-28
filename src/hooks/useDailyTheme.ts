import { useState, useEffect, useCallback, useRef } from 'react';
import type { DailyTheme, UseDailyThemeResult } from '../types/game';

const FALLBACK_THEME: DailyTheme = {
  themeName: 'GENERAL',
  description: 'A mix of everyday words',
  wordList: ['python', 'rocket', 'castle', 'garden', 'planet']
};

function isDailyTheme(value: unknown): value is DailyTheme {
  if (!value || typeof value !== 'object') return false;
  const theme = value as Partial<DailyTheme>;
  return typeof theme.themeName === 'string' && theme.themeName.trim().length > 0
    && typeof theme.description === 'string'
    && Array.isArray(theme.wordList) && theme.wordList.length === 5
    && theme.wordList.every(word => typeof word === 'string' && word.trim().length > 0);
}

export function useDailyTheme(dateKey: string): UseDailyThemeResult {
  const [theme, setTheme] = useState<DailyTheme | null>(null);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const [practiceTheme, setPracticeTheme] = useState<DailyTheme>(FALLBACK_THEME);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const mounted = useRef(false);

  const retry = useCallback(() => {
    if (!mounted.current || activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setIsLoading(true);
    setError(null);
    setTheme(null);
    setLoadedDate(null);

    const load = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}themes.json`, { signal: controller.signal });
        if (!response.ok) throw new Error('fetch');
        const data: unknown = await response.json();
        if (controller.signal.aborted || !mounted.current) return;
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid');
        const entries = data as Record<string, unknown>;
        setPracticeTheme(isDailyTheme(entries._fallback) ? entries._fallback : FALLBACK_THEME);
        if (!isDailyTheme(entries[dateKey])) throw new Error('missing');
        setTheme(entries[dateKey]);
      } catch (cause) {
        if (controller.signal.aborted || !mounted.current) return;
        setError(cause instanceof Error && cause.message === 'missing'
          ? "Today's challenge isn't available right now. Please retry, or play a fallback practice round."
          : "We couldn't load today's challenge. Please retry, or play a fallback practice round.");
      } finally {
        if (activeRequest.current === controller) activeRequest.current = null;
        if (!controller.signal.aborted && mounted.current) {
          setLoadedDate(dateKey);
          setIsLoading(false);
        }
      }
    };
    void load();
  }, [dateKey]);

  useEffect(() => {
    mounted.current = true;
    retry();
    return () => {
      mounted.current = false;
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
  }, [retry]);

  return { theme: loadedDate === dateKey ? theme : null, practiceTheme,
    isLoading: loadedDate !== dateKey || isLoading,
    error: loadedDate === dateKey ? error : null, retry };
}
