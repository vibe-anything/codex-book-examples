import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { exampleMarketSnapshot } from "../data/marketSnapshot.js";
import { changeTone, formatSigned } from "../lib/market.js";
import {
  normalizeThemePreference,
  resolveTheme,
  themeInitializationScript,
} from "../lib/theme.js";

test("저장한 화면 모드를 복원하고 저장값이 없으면 시스템 설정을 따른다", () => {
  assert.equal(normalizeThemePreference("dark"), "dark");
  assert.equal(normalizeThemePreference("light"), "light");
  assert.equal(normalizeThemePreference("unknown"), "system");
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("첫 화면을 그리기 전에 저장값을 우선하고 없으면 시스템 테마를 적용한다", () => {
  function runInitialization(savedPreference, prefersDark) {
    const dataset = {};
    runInNewContext(themeInitializationScript, {
      document: { documentElement: { dataset } },
      window: {
        localStorage: { getItem: () => savedPreference },
        matchMedia: () => ({ matches: prefersDark }),
      },
    });
    return dataset.theme;
  }

  assert.equal(runInitialization(null, true), "dark");
  assert.equal(runInitialization(null, false), "light");
  assert.equal(runInitialization("light", true), "light");
  assert.equal(runInitialization("dark", false), "dark");
});

test("예시 데이터의 상승과 하락을 색상 분류와 부호로 함께 구분한다", () => {
  const changes = [
    ...exampleMarketSnapshot.indices.map((index) => index.changePercent),
    ...exampleMarketSnapshot.sectors.map((sector) => sector.changePercent),
    ...Object.values(exampleMarketSnapshot.rankings)
      .flat()
      .map((stock) => stock.changePercent),
  ];

  assert.ok(changes.some((value) => value > 0));
  assert.ok(changes.some((value) => value < 0));

  for (const value of changes) {
    const formatted = formatSigned(value, 2);
    if (value > 0) {
      assert.equal(changeTone(value), "up");
      assert.ok(formatted.startsWith("+"));
    } else if (value < 0) {
      assert.equal(changeTone(value), "down");
      assert.ok(formatted.startsWith("−"));
    }
  }
});
