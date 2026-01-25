import { useState, useEffect, useMemo } from 'react';
import type { DailyTheme, ThemesData, UseDailyThemeResult } from '../types/game';

const FALLBACK_THEME: DailyTheme = {
  themeName: 'GENERAL',
  description: 'A mix of everyday words',
  wordList: ['python', 'rocket', 'castle', 'garden', 'planet']
};

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useDailyTheme(): UseDailyThemeResult {
  const [themesData, setThemesData] = useState<ThemesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchThemes() {
      try {
        const response = await fetch('/themes.json');
        if (!response.ok) {
          throw new Error(`Failed to fetch themes: ${response.status}`);
        }
        const data: ThemesData = await response.json();
        if (isMounted) {
          setThemesData(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error loading themes');
          setIsLoading(false);
        }
      }
    }

    fetchThemes();

    return () => {
      isMounted = false;
    };
  }, []);

  const theme = useMemo<DailyTheme | null>(() => {
    if (isLoading || !themesData) return null;

    const today = getLocalDateString();

    // Try to get today's theme
    if (themesData[today]) {
      return themesData[today];
    }

    // Fall back to _fallback entry if present
    if (themesData['_fallback']) {
      return themesData['_fallback'];
    }

    // Ultimate fallback
    return FALLBACK_THEME;
  }, [themesData, isLoading]);

  return { theme, isLoading, error };
}
