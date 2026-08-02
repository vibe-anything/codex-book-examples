export const THEME_STORAGE_KEY = "korea-market-dashboard-theme";
export const DEFAULT_THEME_PREFERENCE = "system";

const THEME_PREFERENCES = new Set(["system", "light", "dark"]);

export function normalizeThemePreference(value) {
  return THEME_PREFERENCES.has(value) ? value : DEFAULT_THEME_PREFERENCE;
}

export function resolveTheme(preference, prefersDark) {
  const normalizedPreference = normalizeThemePreference(preference);
  if (normalizedPreference === "light" || normalizedPreference === "dark") {
    return normalizedPreference;
  }

  return prefersDark ? "dark" : "light";
}

export const themeInitializationScript = `(() => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  try {
    const saved = window.localStorage.getItem("${THEME_STORAGE_KEY}");
    const preference = ["system", "light", "dark"].includes(saved) ? saved : "system";
    document.documentElement.dataset.theme = preference === "system"
      ? (media.matches ? "dark" : "light")
      : preference;
  } catch {
    document.documentElement.dataset.theme = media.matches ? "dark" : "light";
  }
})();`;
