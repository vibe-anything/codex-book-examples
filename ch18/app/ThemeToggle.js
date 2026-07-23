"use client";

import { useEffect, useState } from "react";
import styles from "./ThemeToggle.module.css";
import {
  DARK_THEME,
  LIGHT_THEME,
  THEME_STORAGE_KEY,
  applyTheme,
  getPreferredTheme,
  readThemePreference,
  saveThemePreference,
} from "../lib/themePreference.js";

const THEME_LABEL = {
  [LIGHT_THEME]: "밝은",
  [DARK_THEME]: "어두운",
};

function resolveBrowserTheme() {
  return getPreferredTheme({
    storage: getBrowserStorage(),
    matchMedia: window.matchMedia.bind(window),
  });
}

function getBrowserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function syncTheme() {
      const nextTheme = resolveBrowserTheme();
      applyTheme(document.documentElement, nextTheme);
      setTheme(nextTheme);
    }

    function handleSystemChange(event) {
      if (readThemePreference(getBrowserStorage())) return;

      const nextTheme = event.matches ? DARK_THEME : LIGHT_THEME;
      applyTheme(document.documentElement, nextTheme);
      setTheme(nextTheme);
    }

    function handleStorage(event) {
      if (event.key === THEME_STORAGE_KEY) syncTheme();
    }

    syncTheme();
    mediaQuery.addEventListener("change", handleSystemChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function toggleTheme() {
    const currentTheme = theme ?? resolveBrowserTheme();
    const nextTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;

    saveThemePreference(getBrowserStorage(), nextTheme);
    applyTheme(document.documentElement, nextTheme);
    setTheme(nextTheme);
  }

  const nextTheme = theme === DARK_THEME ? LIGHT_THEME : DARK_THEME;

  return (
    <div className={styles.toolbar}>
      <div className={styles.control} role="group" aria-label="화면 모드">
        <span className={styles.current} aria-live="polite">
          {theme ? `현재 ${THEME_LABEL[theme]} 모드` : "화면 모드 확인 중"}
        </span>
        <button
          className={styles.button}
          type="button"
          onClick={toggleTheme}
          disabled={!theme}
        >
          <span className={styles.icon} aria-hidden="true">
            {nextTheme === DARK_THEME ? "☾" : "☀"}
          </span>
          {theme ? `${THEME_LABEL[nextTheme]} 모드로 전환` : "화면 모드 변경"}
        </button>
      </div>
    </div>
  );
}
