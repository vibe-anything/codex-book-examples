import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { normalizeTheme, resolveTheme, themeInitScript } from "../lib/theme.js";

test("theme preference defaults safely and follows the system until explicitly selected", () => {
  for (const invalid of [null, undefined, "invalid", "system"]) {
    assert.equal(normalizeTheme(invalid), "system");
    assert.equal(resolveTheme(invalid, true), "dark");
    assert.equal(resolveTheme(invalid, false), "light");
  }
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("first-paint script restores saved modes and tolerates blocked storage", () => {
  for (const scenario of [
    { saved: null, systemDark: true, expected: "dark" },
    { saved: null, systemDark: false, expected: "light" },
    { saved: "light", systemDark: true, expected: "light" },
    { saved: "dark", systemDark: false, expected: "dark" },
    { saved: "system", systemDark: true, expected: "dark" },
    { saved: "invalid", systemDark: false, expected: "light" },
    { blocked: true, systemDark: true, expected: "dark" },
  ]) {
    const document = { documentElement: { dataset: {} } };
    vm.runInNewContext(themeInitScript, {
      document,
      localStorage: { getItem() { if (scenario.blocked) throw new Error("blocked"); return scenario.saved; } },
      window: { matchMedia: () => ({ matches: scenario.systemDark }) },
    });
    assert.equal(document.documentElement.dataset.theme, scenario.expected);
  }
});
