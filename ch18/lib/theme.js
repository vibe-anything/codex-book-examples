export const THEME_STORAGE_KEY = "market-dashboard-theme";

export function normalizeTheme(value) {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(preference, systemDark) {
  const normalized = normalizeTheme(preference);
  return normalized === "system" ? (systemDark ? "dark" : "light") : normalized;
}

// Runs before the first paint; storage may be unavailable in private browsing.
export const themeInitScript = `(() => {
  let preference = "system";
  try { preference = localStorage.getItem("${THEME_STORAGE_KEY}"); } catch {}
  const explicit = preference === "light" || preference === "dark";
  const dark = explicit ? preference === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
})();`;
