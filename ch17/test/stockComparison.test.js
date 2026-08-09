import test from "node:test";
import assert from "node:assert/strict";
import {
  describeStockChange,
  getDefaultComparisonCodes,
  restoreComparisonCodes,
  updateComparisonCodes,
} from "../lib/stockComparison.js";

const stocks = [
  { code: "005930", name: "삼성전자", price: 73200, changePercent: 1.81 },
  { code: "000660", name: "SK하이닉스", price: 226500, changePercent: -3.42 },
  { code: "005380", name: "현대차", price: 247000, changePercent: 0 },
];

test("비교 기본값은 서로 다른 유효 종목 두 개다", () => {
  assert.deepEqual(getDefaultComparisonCodes(stocks), ["005930", "000660"]);
  assert.deepEqual(getDefaultComparisonCodes([stocks[0]]), ["005930"]);
  assert.deepEqual(getDefaultComparisonCodes([]), []);
});

test("저장된 비교 선택은 두 종목이 모두 유효할 때만 복원한다", () => {
  assert.deepEqual(
    restoreComparisonCodes(stocks, ["005380", "005930"]),
    ["005380", "005930"],
  );
  assert.deepEqual(
    restoreComparisonCodes(stocks, ["005930", "005930"]),
    ["005930", "000660"],
  );
  assert.deepEqual(
    restoreComparisonCodes(stocks, ["없는코드", "005380"]),
    ["005930", "000660"],
  );
  assert.deepEqual(restoreComparisonCodes(stocks, "잘못된 저장값"), [
    "005930",
    "000660",
  ]);
});

test("같은 종목을 선택하면 기존 비교를 유지하고 안내한다", () => {
  const result = updateComparisonCodes(
    stocks,
    ["005930", "000660"],
    0,
    "000660",
  );

  assert.deepEqual(result.codes, ["005930", "000660"]);
  assert.match(result.error, /서로 다른 두 종목/);
});

test("서로 다른 유효 종목은 선택을 갱신한다", () => {
  assert.deepEqual(
    updateComparisonCodes(stocks, ["005930", "000660"], 1, "005380"),
    { codes: ["005930", "005380"], error: "" },
  );
});

test("등락은 색상용 상태와 상승·하락·보합 문구 및 부호를 함께 제공한다", () => {
  assert.deepEqual(describeStockChange(1.234), {
    tone: "up",
    label: "상승",
    signedPercent: "+1.23%",
    accessibleText: "상승 +1.23%",
  });
  assert.deepEqual(describeStockChange(-2), {
    tone: "down",
    label: "하락",
    signedPercent: "−2.00%",
    accessibleText: "하락 −2.00%",
  });
  assert.deepEqual(describeStockChange(0), {
    tone: "flat",
    label: "보합",
    signedPercent: "0.00%",
    accessibleText: "보합 0.00%",
  });
});
