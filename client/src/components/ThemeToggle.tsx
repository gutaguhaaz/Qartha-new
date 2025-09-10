import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme, actualTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(actualTheme === 'dark' ? 'light' : 'dark');
    } else {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  };

  const getIcon = () => {
    if (theme === 'system') {
      return actualTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
    return theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
  };

  const getTitle = () => {
    if (theme === 'system') {
      return `System (${actualTheme === 'dark' ? 'Dark' : 'Light'})`;
    }
    return theme === 'dark' ? 'Dark Mode' : 'Light Mode';
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
      title={getTitle()}
      aria-label="Toggle theme"
      data-testid="button-theme-toggle"
    >
      <i className={`${getIcon()} text-lg`}></i>
    </button>
  );
}