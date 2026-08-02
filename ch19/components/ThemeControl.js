"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_STORAGE_KEY,
  normalizeThemePreference,
  resolveTheme,
} from "@/lib/theme";

function readSavedPreference() {
  try {
    return normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

export function ThemeControl() {
  const [preference, setPreference] = useState(DEFAULT_THEME_PREFERENCE);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setPreference(readSavedPreference());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      document.documentElement.dataset.theme = resolveTheme(preference, media.matches);
    };

    applyTheme();
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // 저장 공간을 사용할 수 없어도 현재 화면의 테마는 유지한다.
    }

    if (preference === DEFAULT_THEME_PREFERENCE) {
      media.addEventListener("change", applyTheme);
      return () => media.removeEventListener("change", applyTheme);
    }
  }, [isReady, preference]);

  return (
    <div className="theme-control">
      <label htmlFor="theme-preference">
        <span aria-hidden="true">◐</span>
        화면 모드
      </label>
      <select
        id="theme-preference"
        value={preference}
        onChange={(event) => setPreference(event.target.value)}
        aria-label="화면 모드"
      >
        <option value="system">시스템 설정</option>
        <option value="light">라이트</option>
        <option value="dark">다크</option>
      </select>
    </div>
  );
}
