import test from "node:test";
import assert from "node:assert/strict";
import { comparisonStocks, initialComparison, selectComparison } from "../lib/comparison.js";
import { changeTone, formatPrice, formatSigned } from "../lib/market.js";

const stocks = [
  { code: "005930", name: "삼성전자", price: 70000, changePercent: 1.25 },
  { code: "000660", name: "SK하이닉스", price: 180000, changePercent: -2.5 },
];

test("예시 시세 두 종목을 구분해 나란히 표시할 값을 제공한다", () => {
  assert.deepEqual(initialComparison(stocks), ["005930", "000660"]);
  assert.equal(formatPrice(stocks[0].price), "70,000원");
  assert.equal(formatSigned(stocks[0].changePercent), "+1.25");
  assert.equal(formatSigned(stocks[1].changePercent), "−2.50");
  assert.equal(changeTone(stocks[1].changePercent), "down");
});
test("저장 선택을 복구하고 중복 선택은 기존 선택과 안내를 반환한다", () => {
  const saved = ["000660", "005930"];
  assert.deepEqual(initialComparison(stocks, JSON.parse(JSON.stringify(saved))), saved);
  assert.deepEqual(selectComparison(saved, 0, "005930").selection, saved);
  assert.match(selectComparison(saved, 0, "005930").error, /다른 종목/);
  assert.deepEqual(initialComparison(stocks, ["005930", "005930"]), ["005930", "000660"]);
});
test("누락된 저장 종목은 유지하고 빈 데이터 및 잘못된 저장값을 처리한다", () => {
  assert.deepEqual(initialComparison(stocks, ["missing", "000660"]), ["missing", "000660"]);
  assert.deepEqual(initialComparison([], null), ["", ""]);
  assert.deepEqual(initialComparison(stocks, { unexpected: true }), ["005930", "000660"]);
  assert.deepEqual(initialComparison(stocks.slice(0, 1)), ["005930", ""]);
});
test("수집 종목 중복을 제거하고 예시 랭킹 데이터로 대체한다", () => {
  assert.equal(comparisonStocks({ stocks: [...stocks, stocks[0]] }).length, 2);
  assert.equal(comparisonStocks({ rankings: { gainers: [stocks[0]], turnover: [stocks[0]] } })[0].code, "mock:삼성전자");
});
