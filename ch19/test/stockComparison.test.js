import test from "node:test";
import assert from "node:assert/strict";
import { exampleMarketSnapshot } from "../data/marketSnapshot.js";
import {
  SAME_STOCK_MESSAGE,
  normalizeComparisonCodes,
  parseSavedComparisonCodes,
  selectComparisonStock,
} from "../lib/stockComparison.js";

const exampleStocks = Array.from(
  new Map(
    Object.values(exampleMarketSnapshot.rankings)
      .flat()
      .map((stock) => [stock.code, stock])
  ).values()
);

test("예시 데이터에서 서로 다른 두 종목을 비교 기본값으로 고른다", () => {
  assert.deepEqual(normalizeComparisonCodes(exampleStocks), ["E001", "E002"]);
});

test("저장한 비교 종목을 복원하고 없거나 중복된 코드는 유효한 종목으로 채운다", () => {
  assert.deepEqual(
    normalizeComparisonCodes(exampleStocks, ["005930", "000660"]),
    ["005930", "000660"]
  );
  assert.deepEqual(
    normalizeComparisonCodes(exampleStocks, ["없는코드", "005930", "005930"]),
    ["005930", "E001"]
  );
  assert.deepEqual(parseSavedComparisonCodes('["005930","000660"]'), ["005930", "000660"]);
  assert.deepEqual(parseSavedComparisonCodes("잘못된 JSON"), []);
});

test("같은 종목을 고르면 기존 비교를 유지하고 다른 종목 선택을 안내한다", () => {
  const currentCodes = ["005930", "000660"];
  const result = selectComparisonStock(currentCodes, 0, "000660");

  assert.equal(result.selectedCodes, currentCodes);
  assert.equal(result.error, SAME_STOCK_MESSAGE);
});

test("다른 종목을 고르면 해당 비교 칸만 바꾼다", () => {
  assert.deepEqual(selectComparisonStock(["005930", "000660"], 1, "005380"), {
    selectedCodes: ["005930", "005380"],
    error: "",
  });
});
