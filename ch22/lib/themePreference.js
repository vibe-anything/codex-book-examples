export const THEME_STORAGE_KEY = "market-dashboard-theme";
export const LIGHT_THEME = "light";
export const DARK_THEME = "dark";

export function normalizeTheme(value) {
  return value === LIGHT_THEME || value === DARK_THEME ? value : null;
}

export function resolveTheme({ storedTheme, systemPrefersDark = false } = {}) {
  return normalizeTheme(storedTheme) ?? (systemPrefersDark ? DARK_THEME : LIGHT_THEME);
}

export function readThemePreference(storage) {
  try {
    return normalizeTheme(storage?.getItem?.(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveThemePreference(storage, theme) {
  const normalizedTheme = normalizeTheme(theme);

  if (!normalizedTheme || typeof storage?.setItem !== "function") return false;

  try {
    storage.setItem(THEME_STORAGE_KEY, normalizedTheme);
    return true;
  } catch {
    return false;
  }
}

export function systemPrefersDark(matchMedia) {
  try {
    return matchMedia?.("(prefers-color-scheme: dark)")?.matches === true;
  } catch {
    return false;
  }
}

export function getPreferredTheme({ storage, matchMedia } = {}) {
  return resolveTheme({
    storedTheme: readThemePreference(storage),
    systemPrefersDark: systemPrefersDark(matchMedia),
  });
}

export function applyTheme(root, theme) {
  const normalizedTheme = normalizeTheme(theme);

  if (!root || !normalizedTheme) return false;

  root.dataset.theme = normalizedTheme;
  root.style.colorScheme = normalizedTheme;
  return true;
}

export function createThemeInitializerScript() {
  const storageKey = JSON.stringify(THEME_STORAGE_KEY);
  const mediaQuery = JSON.stringify("(prefers-color-scheme: dark)");

  return `(() => {
    const root = document.documentElement;
    let storedTheme = null;
    let systemPrefersDark = false;

    try {
      storedTheme = window.localStorage.getItem(${storageKey});
    } catch {}

    if (storedTheme !== "light" && storedTheme !== "dark") {
      storedTheme = null;

      try {
        systemPrefersDark = window.matchMedia(${mediaQuery}).matches;
      } catch {}
    }

    const theme = storedTheme ?? (systemPrefersDark ? "dark" : "light");
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  })();`;
}
