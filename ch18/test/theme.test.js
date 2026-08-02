import test from "node:test";
import assert from "node:assert/strict";
import {
  nextTheme,
  normalizeTheme,
  resolveTheme,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
} from "../components/theme.js";

test("저장된 화면 모드는 컴퓨터 설정보다 우선한다", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("저장된 선택이 없으면 컴퓨터 화면 설정을 따른다", () => {
  assert.equal(resolveTheme(null, true), "dark");
  assert.equal(resolveTheme(null, false), "light");
  assert.equal(resolveTheme("unknown", true), "dark");
});

test("라이트와 다크 모드를 서로 전환한다", () => {
  assert.equal(nextTheme("light"), "dark");
  assert.equal(nextTheme("dark"), "light");
  assert.equal(normalizeTheme("sepia"), null);
});

test("초기화 스크립트는 저장 키와 시스템 다크 모드 설정을 확인한다", () => {
  assert.match(THEME_INIT_SCRIPT, new RegExp(THEME_STORAGE_KEY));
  assert.match(THEME_INIT_SCRIPT, /prefers-color-scheme: dark/);
  assert.match(THEME_INIT_SCRIPT, /document\.documentElement\.dataset\.theme/);
});
