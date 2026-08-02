"use client";

import { useEffect, useState } from "react";
import {
  nextTheme,
  normalizeTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
} from "./theme";

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readSavedTheme() {
  try {
    return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const initialTheme = normalizeTheme(document.documentElement.dataset.theme)
      ?? resolveTheme(readSavedTheme(), mediaQuery.matches);

    applyTheme(initialTheme);
    setTheme(initialTheme);

    function handleSystemTheme(event) {
      if (readSavedTheme()) return;
      const systemTheme = resolveTheme(null, event.matches);
      applyTheme(systemTheme);
      setTheme(systemTheme);
    }

    function handleStoredTheme(event) {
      if (event.key !== THEME_STORAGE_KEY) return;
      const storedTheme = normalizeTheme(event.newValue);
      const syncedTheme = resolveTheme(storedTheme, mediaQuery.matches);
      applyTheme(syncedTheme);
      setTheme(syncedTheme);
    }

    mediaQuery.addEventListener("change", handleSystemTheme);
    window.addEventListener("storage", handleStoredTheme);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemTheme);
      window.removeEventListener("storage", handleStoredTheme);
    };
  }, []);

  function handleToggle() {
    const currentTheme = theme
      ?? resolveTheme(
        normalizeTheme(document.documentElement.dataset.theme),
        systemPrefersDark()
      );
    const selectedTheme = nextTheme(currentTheme);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);
    } catch {
      // 저장 공간을 사용할 수 없어도 현재 탭의 테마 전환은 유지한다.
    }

    applyTheme(selectedTheme);
    setTheme(selectedTheme);
  }

  const isDark = theme === "dark";
  const label = theme
    ? `${isDark ? "라이트" : "다크"} 모드로 전환`
    : "화면 모드 전환";

  return (
    <div className="theme-control">
      <button
        aria-label={label}
        aria-pressed={isDark}
        className="theme-toggle"
        onClick={handleToggle}
        type="button"
      >
        <span aria-hidden="true" className="theme-toggle-icon">
          {isDark ? "☾" : "☀"}
        </span>
        <span>{theme ? `${isDark ? "다크" : "라이트"} 모드` : "화면 모드"}</span>
      </button>
    </div>
  );
}
