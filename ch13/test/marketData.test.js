import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMarketSnapshot,
  getMarketSnapshot,
  SECTOR_INDEX_MAPPING,
} from "../lib/marketData.js";
import {
  MARKET_INDEX_PATH,
  STOCK_PRICE_PATH,
} from "../lib/dataGoKr.js";

const DATA_DATE = "20260730";
const NOW = new Date("2026-08-03T03:00:00.000Z");

function makeStockItems(basDt = DATA_DATE) {
  return Array.from({ length: 12 }, (_, index) => {
    const changePercent = index < 6 ? 10 - index : -(index - 5);
    return {
      basDt,
      mrktCtg: index % 2 ? "KOSDAQ" : "KOSPI",
      itmsNm: `테스트종목${String(index + 1).padStart(2, "0")}`,
      clpr: String(10_000 + index * 1_000),
      fltRt: String(changePercent),
      trPrc: String((index + 1) * 100_000_000),
    };
  });
}

function makeIndexItems(basDt = DATA_DATE) {
  const marketIndices = [
    {
      basDt,
      idxNm: "코스피",
      idxCsf: "KOSPI시리즈",
      clpr: "5593.56",
      vs: "-69.68",
      fltRt: "-1.23",
    },
    {
      basDt,
      idxNm: "코스닥",
      idxCsf: "KOSDAQ시리즈",
      clpr: "644.78",
      vs: "-17.9",
      fltRt: "-2.7",
    },
  ];
  const sectors = SECTOR_INDEX_MAPPING.filter(({ indexName }) => indexName).map(
    ({ indexName }, index) => ({
      basDt,
      idxNm: indexName,
      idxCsf: "KRX시리즈",
      clpr: String(1_000 + index),
      vs: String(index - 4),
      fltRt: String((index - 4) / 10),
    }),
  );

  return [
    ...marketIndices,
    ...sectors,
    {
      basDt,
      idxNm: "KRX 게임 TOP 10 지수",
      idxCsf: "테마지수",
      clpr: "600",
      vs: "24",
      fltRt: "4",
    },
  ];
}

function assertCompleteFallback(snapshot) {
  assert.equal(snapshot.isMock, true);
  assert.equal(snapshot.indices.length, 2);
  assert.equal(snapshot.sectors.length, 12);
  assert.equal(snapshot.sectors.filter(({ available }) => available === false).length, 4);
  assert.equal(snapshot.rankings.gainers.length, 5);
  assert.equal(snapshot.rankings.losers.length, 5);
  assert.equal(snapshot.rankings.turnover.length, 5);
}

test("실제 API 항목으로 화면 스냅샷을 계산한다", () => {
  const snapshot = buildMarketSnapshot({
    stockItems: makeStockItems(),
    indexItems: makeIndexItems(),
    now: NOW,
    minimumStockRows: 10,
  });

  assert.equal(snapshot.isMock, false);
  assert.equal(snapshot.asOf, "2026.07.30 종가");
  assert.deepEqual(snapshot.indices.map(({ code }) => code), ["KOSPI", "KOSDAQ"]);
  assert.equal("intraday" in snapshot.indices[0], false);
  assert.deepEqual(snapshot.marketBreadth, {
    totalStocks: 12,
    stocksUpThreePercent: 6,
  });
  assert.equal(snapshot.rankings.gainers.length, 5);
  assert.equal(snapshot.rankings.losers.length, 5);
  assert.equal(snapshot.rankings.turnover[0].turnover, 12);
  assert.deepEqual(snapshot.sectors.map(({ name }) => name), [
    "반도체",
    "자동차",
    "은행",
    "증권",
    "건설",
    "철강",
    "운송",
    "방송통신",
    "조선",
    "게임",
    "2차전지",
    "화장품",
  ]);
  assert.equal(snapshot.sectors.filter(({ available }) => available).length, 8);
  assert.equal(snapshot.sectors.find(({ name }) => name === "게임").changePercent, null);
});

test("API 호출 실패 시 예시 데이터로 돌아간다", async () => {
  const snapshot = await getMarketSnapshot({
    fetchItems: async () => {
      throw new Error("network failure");
    },
    now: NOW,
    onFallback: () => {},
  });

  assertCompleteFallback(snapshot);
});

test("빈 응답 시 예시 데이터로 돌아간다", async () => {
  const snapshot = await getMarketSnapshot({
    fetchItems: async () => [],
    now: NOW,
    onFallback: () => {},
  });

  assertCompleteFallback(snapshot);
});

test("두 API의 최신 기준일이 다르면 갱신 지연으로 보고 예시 데이터를 쓴다", async () => {
  const snapshot = await getMarketSnapshot({
    fetchItems: async (pathname) =>
      pathname === STOCK_PRICE_PATH
        ? makeStockItems("20260730")
        : makeIndexItems("20260729"),
    now: NOW,
    onFallback: () => {},
  });

  assertCompleteFallback(snapshot);
});

test("허용 범위보다 오래된 응답이면 예시 데이터로 돌아간다", async () => {
  const snapshot = await getMarketSnapshot({
    fetchItems: async (pathname) =>
      pathname === MARKET_INDEX_PATH
        ? makeIndexItems("20260701")
        : makeStockItems("20260701"),
    now: NOW,
    onFallback: () => {},
  });

  assertCompleteFallback(snapshot);
});
