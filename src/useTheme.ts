import { useEffect } from 'react';
import { useLocalState } from './useLocalState';

export type Theme = 'light' | 'black';

// Must be the same as the page background of each theme in index.css
const BAR_COLORS: Record<Theme, string> = { light: '#FFF6F0', black: '#000000' };

// index.html reads the same key before the first paint, so black doesn't flash cream
export function useTheme() {
  const [theme, setTheme] = useLocalState<Theme>('gym-routines:theme:v1', 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLORS[theme]);
  }, [theme]);

  return [theme, setTheme] as const;
}
