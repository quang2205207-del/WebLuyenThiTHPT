import { useEffect, useState } from 'react';

export default function ThemeToggle({ className = '', showLabel = true }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('thpt_theme');
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('thpt_theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      title={isDark ? 'Chế độ tối' : 'Chế độ sáng'}
      aria-label="Đổi chế độ sáng tối"
    >
      <span className="theme-icon" aria-hidden="true">
        {isDark ? '🌙' : '☀️'}
      </span>
      {showLabel && (
        <span className="theme-label">
          {isDark ? '' : ''}
        </span>
      )}
    </button>
  );
}
