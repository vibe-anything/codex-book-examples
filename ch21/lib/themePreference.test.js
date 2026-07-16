import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {
  DARK_THEME,
  LIGHT_THEME,
  THEME_STORAGE_KEY,
  applyTheme,
  createThemeInitializerScript,
  getPreferredTheme,
  normalizeTheme,
  readThemePreference,
  resolveTheme,
  saveThemePreference,
} from "./themePreference.js";

function createStorage(initialValue = null) {
  let value = initialValue;

  return {
    getItem(key) {
      assert.equal(key, THEME_STORAGE_KEY);
      return value;
    },
    setItem(key, nextValue) {
      assert.equal(key, THEME_STORAGE_KEY);
      value = nextValue;
    },
    value() {
      return value;
    },
  };
}

function runInitializer({ storedTheme = null, systemPrefersDark = false } = {}) {
  const root = { dataset: {}, style: {} };
  const storage = createStorage(storedTheme);

  vm.runInNewContext(createThemeInitializerScript(), {
    document: { documentElement: root },
    window: {
      localStorage: storage,
      matchMedia: () => ({ matches: systemPrefersDark }),
    },
  });

  return root;
}

test("저장값이 없으면 시스템 화면 설정을 따른다", () => {
  assert.equal(resolveTheme({ storedTheme: null, systemPrefersDark: false }), LIGHT_THEME);
  assert.equal(resolveTheme({ storedTheme: null, systemPrefersDark: true }), DARK_THEME);
  assert.equal(
    getPreferredTheme({ storage: createStorage(), matchMedia: () => ({ matches: true }) }),
    DARK_THEME
  );
});

test("저장된 밝은/어두운 모드는 시스템 설정보다 우선한다", () => {
  assert.equal(resolveTheme({ storedTheme: LIGHT_THEME, systemPrefersDark: true }), LIGHT_THEME);
  assert.equal(resolveTheme({ storedTheme: DARK_THEME, systemPrefersDark: false }), DARK_THEME);
  assert.equal(normalizeTheme("unknown"), null);
});

test("토글 선택을 저장하고 다시 읽는다", () => {
  const storage = createStorage();

  assert.equal(saveThemePreference(storage, DARK_THEME), true);
  assert.equal(storage.value(), DARK_THEME);
  assert.equal(readThemePreference(storage), DARK_THEME);
  assert.equal(saveThemePreference(storage, "unknown"), false);
  assert.equal(storage.value(), DARK_THEME);
  assert.equal(saveThemePreference(null, LIGHT_THEME), false);
});

test("테마를 문서 루트에 적용한다", () => {
  const root = { dataset: {}, style: {} };

  assert.equal(applyTheme(root, DARK_THEME), true);
  assert.equal(root.dataset.theme, DARK_THEME);
  assert.equal(root.style.colorScheme, DARK_THEME);
  assert.equal(applyTheme(root, "unknown"), false);
});

test("첫 페인트 초기화도 시스템 및 저장된 선택을 올바르게 결정한다", () => {
  assert.equal(runInitializer({ systemPrefersDark: true }).dataset.theme, DARK_THEME);
  assert.equal(
    runInitializer({ storedTheme: "unknown", systemPrefersDark: true }).dataset.theme,
    DARK_THEME
  );
  assert.equal(
    runInitializer({ storedTheme: LIGHT_THEME, systemPrefersDark: true }).dataset.theme,
    LIGHT_THEME
  );
  assert.equal(
    runInitializer({ storedTheme: DARK_THEME, systemPrefersDark: false }).dataset.theme,
    DARK_THEME
  );
});
