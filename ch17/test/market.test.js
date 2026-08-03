import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateMarketHeat,
  changeTone,
  formatSigned,
  formatTurnover,
  sectorToneClass,
} from "../lib/market.js";

test("시장 열기는 3% 이상 상승 종목 비율을 계산한다", () => {
  assert.equal(calculateMarketHeat({ totalStocks: 2734, stocksUpThreePercent: 421 }).toFixed(1), "15.4");
});

test("시장 열기는 잘못된 분모와 범위 밖 값을 안전하게 처리한다", () => {
  assert.equal(calculateMarketHeat({ totalStocks: 0, stocksUpThreePercent: 3 }), 0);
  assert.equal(calculateMarketHeat({ totalStocks: 10, stocksUpThreePercent: 12 }), 100);
  assert.equal(calculateMarketHeat({ totalStocks: 10, stocksUpThreePercent: -2 }), 0);
});

test("등락 값과 색상 클래스를 명시적으로 포맷한다", () => {
  assert.equal(formatSigned(1.2), "+1.20");
  assert.equal(formatSigned(-1.2), "−1.20");
  assert.equal(changeTone(0), "flat");
  assert.equal(sectorToneClass(2.84), "sector-up-3");
  assert.equal(sectorToneClass(-3.12), "sector-down-4");
});

test("거래대금을 억원과 조원 단위로 축약한다", () => {
  assert.equal(formatTurnover(6840), "6,840억원");
  assert.equal(formatTurnover(14820), "1.5조원");
});
