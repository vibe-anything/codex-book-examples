"use client";

import { useEffect, useState } from "react";
import { isTheme, resolveTheme, THEME_STORAGE_KEY } from "@/lib/theme";

const DARK_MODE_QUERY = "(prefers-color-scheme: dark)";

function readStoredTheme() {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(storedTheme) ? storedTheme : null;
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
    const systemPreference = window.matchMedia(DARK_MODE_QUERY);

    function renderTheme(nextTheme) {
      applyTheme(nextTheme);
      setTheme(nextTheme);
    }

    function syncStoredOrSystemTheme() {
      renderTheme(resolveTheme(readStoredTheme(), systemPreference.matches));
    }

    function handleSystemChange(event) {
      if (!readStoredTheme()) renderTheme(resolveTheme(null, event.matches));
    }

    function handleStorageChange(event) {
      if (event.key === THEME_STORAGE_KEY) syncStoredOrSystemTheme();
    }

    syncStoredOrSystemTheme();
    systemPreference.addEventListener("change", handleSystemChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      systemPreference.removeEventListener("change", handleSystemChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  function chooseTheme(nextTheme) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // 저장소가 제한되어도 현재 탭의 화면 모드는 바꿀 수 있다.
    }

    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  return (
    <div className="theme-toggle" role="group" aria-label="화면 모드">
      <button
        type="button"
        className="theme-toggle-option"
        onClick={() => chooseTheme("light")}
        aria-label="라이트 모드 사용"
        aria-pressed={theme === "light"}
      >
        <span aria-hidden="true">☀︎</span>
        <span>라이트</span>
      </button>
      <button
        type="button"
        className="theme-toggle-option"
        onClick={() => chooseTheme("dark")}
        aria-label="다크 모드 사용"
        aria-pressed={theme === "dark"}
      >
        <span aria-hidden="true">◐</span>
        <span>다크</span>
      </button>
    </div>
  );
}
