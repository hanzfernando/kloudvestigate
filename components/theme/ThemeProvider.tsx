"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

export type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeMode;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = "kloudvestigate-theme";
const THEME_CHANGE_EVENT = "kloudvestigate-theme-change";
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeToThemeChanges, getPreferredTheme, getServerTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => {
        const nextTheme = theme === "dark" ? "light" : "dark";

        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        applyTheme(nextTheme);
        window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
}

function getPreferredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === "dark" || savedTheme === "light") return savedTheme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getServerTheme(): ThemeMode {
  return "light";
}

function subscribeToThemeChanges(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleThemeChange = () => onStoreChange();
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) onStoreChange();
  };

  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  window.addEventListener("storage", handleStorageChange);
  colorSchemeQuery.addEventListener("change", handleThemeChange);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    window.removeEventListener("storage", handleStorageChange);
    colorSchemeQuery.removeEventListener("change", handleThemeChange);
  };
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}
