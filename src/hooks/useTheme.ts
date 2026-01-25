import { useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

export function useTheme() {
  const [lightMode, setLightMode] = useLocalStorage<boolean>('lightMode', false);

  useEffect(() => {
    if (lightMode) {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [lightMode]);

  const toggleTheme = useCallback(() => {
    setLightMode(prev => !prev);
  }, [setLightMode]);

  return { lightMode, toggleTheme };
}
