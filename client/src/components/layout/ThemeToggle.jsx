import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

const media = () => window.matchMedia('(prefers-color-scheme: dark)');
const currentTheme = () => document.documentElement.dataset.theme ?? (media().matches ? 'dark' : 'light');

export function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme);
  const next = theme === 'dark' ? 'light' : 'dark';

  // Follow OS changes until the user picks a theme explicitly.
  useEffect(() => {
    const mq = media();
    const onChange = () => setTheme(currentTheme());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  function toggle() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('lf-theme', next);
    } catch {
      /* private mode: the choice just won't persist */
    }
    setTheme(next);
  }

  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      {theme === 'dark' ? <Sun className="icon" aria-hidden="true" /> : <Moon className="icon" aria-hidden="true" />}
    </button>
  );
}
