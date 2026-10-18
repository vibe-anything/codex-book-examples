"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeTheme, resolveTheme, THEME_STORAGE_KEY } from "@/lib/theme";

export default function ThemeToggle() {
  const selectedRef = useRef("system");
  const [preference, setPreference] = useState("system");

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    let selected = "system";
    try { selected = normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY)); } catch {}
    selectedRef.current = selected;
    setPreference(selected);
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(selectedRef.current, media.matches);
    };
    const sync = (event) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        selected = normalizeTheme(event.newValue);
        selectedRef.current = selected;
        setPreference(selected);
        apply();
      }
    };
    apply();
    media.addEventListener("change", apply);
    window.addEventListener("storage", sync);
    return () => {
      media.removeEventListener("change", apply);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function changeTheme(event) {
    const selected = normalizeTheme(event.target.value);
    selectedRef.current = selected;
    setPreference(selected);
    document.documentElement.dataset.theme = resolveTheme(
      selected, window.matchMedia("(prefers-color-scheme: dark)").matches,
    );
    try { localStorage.setItem(THEME_STORAGE_KEY, selected); } catch {}
  }

  return (
    <div className="theme-toolbar">
      <label htmlFor="screen-theme">화면 모드</label>
      <select id="screen-theme" value={preference} onChange={changeTheme}>
        <option value="system">시스템 설정</option>
        <option value="light">라이트</option>
        <option value="dark">다크</option>
      </select>
    </div>
  );
}
