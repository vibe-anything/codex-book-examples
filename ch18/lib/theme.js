export const THEME_STORAGE_KEY = "market-dashboard-theme";

export const THEMES = ["light", "dark"];

export function isTheme(value) {
  return THEMES.includes(value);
}

export function resolveTheme(storedTheme, prefersDark = false) {
  if (isTheme(storedTheme)) return storedTheme;
  return prefersDark ? "dark" : "light";
}

export const themeInitializationScript = `(() => {
  const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
  let storedTheme = null;

  try {
    storedTheme = window.localStorage.getItem(storageKey);
  } catch {
    // 저장소가 차단된 경우에도 시스템 화면 설정을 따른다.
  }

  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const theme = storedTheme === "light" || storedTheme === "dark"
    ? storedTheme
    : prefersDark ? "dark" : "light";

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();`;
