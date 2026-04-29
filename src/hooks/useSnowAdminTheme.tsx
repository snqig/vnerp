'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type NavigationMode = 'sidebar' | 'top' | 'mixed';

export interface SnowAdminThemeState {
  navigationMode: NavigationMode;
  sidebarDark: boolean;
  colorWeak: boolean;
  grayMode: boolean;
}

const STORAGE_KEY = 'snow-admin-theme';

const defaultState: SnowAdminThemeState = {
  navigationMode: 'sidebar',
  sidebarDark: false,
  colorWeak: false,
  grayMode: false,
};

function loadState(): SnowAdminThemeState {
  if (typeof window === 'undefined') return defaultState;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultState, ...parsed };
    }
  } catch {}
  return defaultState;
}

function saveState(state: SnowAdminThemeState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

interface SnowAdminThemeContextType extends SnowAdminThemeState {
  setNavigationMode: (mode: NavigationMode) => void;
  setSidebarDark: (dark: boolean) => void;
  setColorWeak: (weak: boolean) => void;
  setGrayMode: (gray: boolean) => void;
  resetTheme: () => void;
}

const SnowAdminThemeContext = createContext<SnowAdminThemeContextType | null>(null);

export function SnowAdminThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SnowAdminThemeState>(defaultState);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setState(loadState());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      saveState(state);
    }
  }, [state, mounted]);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    if (state.colorWeak && !state.grayMode) {
      root.classList.add('snow-color-weak');
    } else {
      root.classList.remove('snow-color-weak');
    }

    if (state.grayMode) {
      root.classList.add('snow-gray-mode');
    } else {
      root.classList.remove('snow-gray-mode');
    }

    root.setAttribute('data-nav-mode', state.navigationMode);

    if (state.sidebarDark) {
      root.classList.add('snow-sidebar-dark');
    } else {
      root.classList.remove('snow-sidebar-dark');
    }
  }, [state, mounted]);

  const setNavigationMode = useCallback((mode: NavigationMode) => {
    setState(prev => ({ ...prev, navigationMode: mode }));
  }, []);

  const setSidebarDark = useCallback((dark: boolean) => {
    setState(prev => ({ ...prev, sidebarDark: dark }));
  }, []);

  const setColorWeak = useCallback((weak: boolean) => {
    setState(prev => ({ ...prev, colorWeak: weak }));
  }, []);

  const setGrayMode = useCallback((gray: boolean) => {
    setState(prev => ({ ...prev, grayMode: gray }));
  }, []);

  const resetTheme = useCallback(() => {
    setState(defaultState);
  }, []);

  return (
    <SnowAdminThemeContext.Provider
      value={{
        ...state,
        setNavigationMode,
        setSidebarDark,
        setColorWeak,
        setGrayMode,
        resetTheme,
      }}
    >
      {children}
    </SnowAdminThemeContext.Provider>
  );
}

export function useSnowAdminTheme() {
  const context = useContext(SnowAdminThemeContext);
  if (!context) {
    throw new Error('useSnowAdminTheme must be used within a SnowAdminThemeProvider');
  }
  return context;
}
