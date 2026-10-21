import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ThemeMode = 'light' | 'dark';

interface UserConfig {
  theme: ThemeMode;
  fontSize: number;
  gridDefault: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  setFontSize: (size: number) => void;
  setGridDefault: (enabled: boolean) => void;
}

const STORAGE_KEY = 'policymind:user-config';

const UserConfigContext = createContext<UserConfig | null>(null);

function readStored(): Partial<UserConfig> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function UserConfigProvider({ children }: { children: ReactNode }) {
  const stored = useMemo(readStored, []);
  const [theme, setTheme] = useState<ThemeMode>(stored.theme === 'dark' ? 'dark' : 'light');
  const [fontSize, setFontSize] = useState(stored.fontSize || 15);
  const [gridDefault, setGridDefault] = useState(Boolean(stored.gridDefault));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.background = theme === 'dark' ? '#0b1220' : '#f8fafc';
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ theme, fontSize, gridDefault }),
    );
  }, [theme, fontSize, gridDefault]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      fontSize,
      gridDefault,
      toggleTheme,
      setTheme,
      setFontSize,
      setGridDefault,
    }),
    [theme, fontSize, gridDefault, toggleTheme],
  );

  return <UserConfigContext.Provider value={value}>{children}</UserConfigContext.Provider>;
}

export function useUserConfig() {
  const context = useContext(UserConfigContext);
  if (!context) {
    throw new Error('useUserConfig must be used inside UserConfigProvider');
  }
  return context;
}
