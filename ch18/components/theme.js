export const THEME_STORAGE_KEY = "market-dashboard-theme";

export function normalizeTheme(value) {
  return value === "light" || value === "dark" ? value : null;
}

export function resolveTheme(storedTheme, prefersDark) {
  return normalizeTheme(storedTheme) ?? (prefersDark ? "dark" : "light");
}

export function nextTheme(currentTheme) {
  return currentTheme === "dark" ? "light" : "dark";
}

export const THEME_INIT_SCRIPT = `(() => {
  const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
  try {
    const savedTheme = localStorage.getItem(storageKey);
    const theme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    const theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }
})();`;
