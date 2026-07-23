import test from "node:test";
import assert from "node:assert/strict";

import { exampleMarketData } from "./exampleMarketData.js";
import {
  DUPLICATE_SELECTION_MESSAGE,
  formatChangeRate,
  movementLabel,
  normalizeComparisonCodes,
  parseStoredComparison,
  updateComparisonSelection,
} from "./stockComparison.js";

const stocks = exampleMarketData.stockSearchItems;

test("예시 데이터에서 서로 다른 두 기본 종목을 선택한다", () => {
  const selected = normalizeComparisonCodes(stocks, []);

  assert.deepEqual(selected, ["000660", "001550"]);
  assert.notEqual(selected[0], selected[1]);
});

test("상승, 하락, 보합을 부호와 텍스트로 구분한다", () => {
  const positive = stocks.find((stock) => stock.code === "000660");
  const negative = stocks.find((stock) => stock.code === "001550");
  const neutral = stocks.find((stock) => stock.code === "017900");

  assert.equal(formatChangeRate(positive.changeRate), "+13.06%");
  assert.equal(movementLabel(positive.changeRate), "상승");
  assert.equal(formatChangeRate(negative.changeRate), "-1.92%");
  assert.equal(movementLabel(negative.changeRate), "하락");
  assert.equal(formatChangeRate(neutral.changeRate), "0.00%");
  assert.equal(movementLabel(neutral.changeRate), "보합");
});

test("같은 종목 선택을 거절하고 기존 두 선택을 보존한다", () => {
  const current = ["000660", "001550"];
  const result = updateComparisonSelection(stocks, current, 1, "000660");

  assert.deepEqual(result.codes, current);
  assert.equal(result.error, DUPLICATE_SELECTION_MESSAGE);
});

test("서로 다른 유효 종목으로 변경한다", () => {
  const result = updateComparisonSelection(
    stocks,
    ["000660", "001550"],
    0,
    "005930"
  );

  assert.deepEqual(result, { codes: ["005930", "001550"], error: "" });
});

test("저장한 두 종목의 순서를 복원한다", () => {
  const restored = parseStoredComparison(JSON.stringify(["005930", "001550"]), stocks);

  assert.deepEqual(restored, ["005930", "001550"]);
});

test("유효하지 않거나 중복된 저장값을 안전한 두 기본값으로 정규화한다", () => {
  const restored = parseStoredComparison(
    JSON.stringify(["없는코드", "005930", "005930"]),
    stocks
  );
  const malformed = parseStoredComparison("{잘못된 JSON", stocks);

  assert.deepEqual(restored, ["005930", "000660"]);
  assert.equal(new Set(restored).size, 2);
  assert.deepEqual(malformed, ["000660", "001550"]);
});
