import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  isTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  themeInitializationScript,
} from "../lib/theme.js";

test("저장된 라이트/다크 모드를 시스템 설정보다 우선한다", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("저장값이 없거나 올바르지 않으면 시스템 설정을 따른다", () => {
  assert.equal(resolveTheme(null, true), "dark");
  assert.equal(resolveTheme(undefined, false), "light");
  assert.equal(resolveTheme("sepia", true), "dark");
});

test("허용된 테마 이름만 유효하다", () => {
  assert.equal(isTheme("light"), true);
  assert.equal(isTheme("dark"), true);
  assert.equal(isTheme("system"), false);
});

test("초기화 스크립트가 같은 저장소 키와 시스템 설정을 사용한다", () => {
  assert.match(themeInitializationScript, new RegExp(THEME_STORAGE_KEY));
  assert.match(themeInitializationScript, /prefers-color-scheme: dark/);
});

test("초기 렌더 전에 저장값 또는 시스템 설정을 문서에 적용한다", () => {
  function runInitialization(storedTheme, prefersDark) {
    const documentElement = { dataset: {}, style: {} };
    const context = {
      document: { documentElement },
      window: {
        localStorage: { getItem: () => storedTheme },
        matchMedia: () => ({ matches: prefersDark }),
      },
    };

    vm.runInNewContext(themeInitializationScript, context);
    return documentElement;
  }

  assert.deepEqual(
    runInitialization("light", true),
    { dataset: { theme: "light" }, style: { colorScheme: "light" } },
  );
  assert.deepEqual(
    runInitialization(null, true),
    { dataset: { theme: "dark" }, style: { colorScheme: "dark" } },
  );
});
