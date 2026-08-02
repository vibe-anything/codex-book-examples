import test from "node:test";
import assert from "node:assert/strict";
import { exampleMarketSnapshot } from "../data/marketSnapshot.js";
import {
  formatComparisonRate,
  getComparableStocks,
  normalizeComparisonCodes,
  selectComparisonCode,
} from "../lib/stockCompare.js";

test("예시 데이터의 순위에서 비교 가능한 고유 종목을 조합한다", () => {
  const stocks = getComparableStocks(exampleMarketSnapshot);

  assert.equal(stocks.length, 15);
  assert.deepEqual(stocks.slice(0, 2).map((stock) => stock.code), ["E001", "E002"]);
});

test("스냅샷에 stocks가 있으면 순위 대신 전체 종목을 사용한다", () => {
  const stocks = [{ code: "A", name: "가" }, { code: "B", name: "나" }];

  assert.deepEqual(getComparableStocks({ stocks, rankings: exampleMarketSnapshot.rankings }), stocks);
});

test("저장된 선택은 존재하는 서로 다른 두 종목으로 복원한다", () => {
  const stocks = getComparableStocks(exampleMarketSnapshot);

  assert.deepEqual(normalizeComparisonCodes(["005930", "E006"], stocks), ["005930", "E006"]);
  assert.deepEqual(normalizeComparisonCodes(["E002", "E002"], stocks), ["E002", "E001"]);
  assert.deepEqual(normalizeComparisonCodes(["UNKNOWN"], stocks), ["E001", "E002"]);
});

test("같은 종목 선택은 안내하고 기존 비교 상태를 유지한다", () => {
  const stocks = getComparableStocks(exampleMarketSnapshot);
  const currentCodes = ["E001", "E002"];
  const result = selectComparisonCode(currentCodes, "right", "E001", stocks);

  assert.deepEqual(result.codes, currentCodes);
  assert.match(result.error, /같은 종목/);
});

test("유효한 선택과 모든 등락 방향에 부호를 명시한다", () => {
  const stocks = getComparableStocks(exampleMarketSnapshot);
  const result = selectComparisonCode(["E001", "E002"], "right", "E006", stocks);

  assert.deepEqual(result, { codes: ["E001", "E006"], error: "" });
  assert.equal(formatComparisonRate(1.2), "+1.20%");
  assert.equal(formatComparisonRate(-1.2), "−1.20%");
  assert.equal(formatComparisonRate(0), "±0.00%");
});
