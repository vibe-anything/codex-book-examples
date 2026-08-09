import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMarketSnapshot,
  buildSupabaseMarketSnapshot,
  getDashboardSnapshot,
  getMarketSnapshot,
  SECTOR_INDEX_MAPPING,
  THEME_INDEX_MAPPING,
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
      srtnCd: String(index + 1).padStart(6, "0"),
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
  const heatmapIndices = [
    ...SECTOR_INDEX_MAPPING,
    ...THEME_INDEX_MAPPING,
  ].map(
    ({ indexName, indexCategory }, index) => ({
      basDt,
      idxNm: indexName,
      idxCsf: indexCategory,
      clpr: String(1_000 + index),
      vs: String(index - 4),
      fltRt: String((index - 4) / 10),
    }),
  );

  const previousMarketIndices = marketIndices.map((item) => ({
    ...item,
    basDt: "20260729",
    clpr: String(Number(item.clpr) - 10),
  }));

  return [
    ...previousMarketIndices,
    ...marketIndices,
    ...heatmapIndices,
  ];
}

function assertCompleteFallback(snapshot) {
  assert.equal(snapshot.isMock, true);
  assert.equal(snapshot.indices.length, 2);
  assert.equal(snapshot.sectors.length, 8);
  assert.equal(snapshot.themes.length, 3);
  assert.equal(snapshot.rankings.gainers.length, 5);
  assert.equal(snapshot.rankings.losers.length, 5);
  assert.equal(snapshot.rankings.turnover.length, 5);
  assert.ok(snapshot.stocks.length > 0);
}

function makeSupabaseRows(tradeDate = "2026-07-30") {
  return makeStockItems(tradeDate.replaceAll("-", "")).map((item) => ({
    trade_date: tradeDate,
    stock_code: item.srtnCd,
    stock_name: item.itmsNm,
    close_price: item.clpr,
    change_rate: item.fltRt,
    trading_value: item.trPrc,
  }));
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
  assert.deepEqual(snapshot.indices[0].recentCloses, [5583.56, 5593.56]);
  assert.deepEqual(snapshot.marketBreadth, {
    totalStocks: 12,
    stocksUpThreePercent: 6,
  });
  assert.equal(snapshot.rankings.gainers.length, 5);
  assert.equal(snapshot.rankings.losers.length, 5);
  assert.equal(snapshot.rankings.turnover[0].turnover, 12);
  assert.equal(snapshot.stocks.length, 12);
  assert.deepEqual(snapshot.stocks[0], {
    code: "000001",
    name: "테스트종목01",
    price: 10000,
    changePercent: 10,
  });
  assert.deepEqual(snapshot.sectors.map(({ name }) => name), [
    "반도체",
    "자동차",
    "은행",
    "증권",
    "건설",
    "철강",
    "운송",
    "방송통신",
  ]);
  assert.deepEqual(snapshot.themes.map(({ name }) => name), [
    "조선",
    "게임",
    "2차전지",
  ]);
  assert.deepEqual(
    snapshot.themes.map(({ sourceIndexName, sourceIndexCategory }) => ({
      sourceIndexName,
      sourceIndexCategory,
    })),
    THEME_INDEX_MAPPING.map(({ indexName, indexCategory }) => ({
      sourceIndexName: indexName,
      sourceIndexCategory: indexCategory,
    })),
  );
});

test("테마 지수는 공식 이름과 테마지수 분류가 모두 일치해야 한다", () => {
  const indexItems = makeIndexItems().map((item) =>
    item.idxNm === "KRX 게임 TOP 10 지수"
      ? { ...item, idxCsf: "KRX시리즈" }
      : item,
  );

  assert.throws(
    () => buildMarketSnapshot({
      stockItems: makeStockItems(),
      indexItems,
      now: NOW,
      minimumStockRows: 10,
    }),
    /KRX 게임 TOP 10 지수 지수 응답이 비어 있거나 올바르지 않습니다/,
  );
});

test("지수 응답에 거래일이 하나뿐이면 미니 차트 칸만 비운다", () => {
  const snapshot = buildMarketSnapshot({
    stockItems: makeStockItems(),
    indexItems: makeIndexItems().filter((item) => item.basDt === DATA_DATE),
    now: NOW,
    minimumStockRows: 10,
  });

  assert.equal(snapshot.isMock, false);
  assert.equal(snapshot.indices[0].value, 5593.56);
  assert.equal(snapshot.indices[0].recentCloses, null);
  assert.equal(snapshot.indices[1].recentCloses, null);
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

test("Supabase 종목 시세와 공공데이터 시장 지표를 함께 사용한다", async () => {
  let publicApiCalled = false;
  const supabaseRows = makeSupabaseRows();
  supabaseRows[5] = { ...supabaseRows[5], change_rate: "2" };
  const snapshot = await getDashboardSnapshot({
    fetchSupabase: async () => ({
      tradeDate: "2026-07-30",
      rows: supabaseRows,
    }),
    fetchItems: async (pathname) => {
      publicApiCalled = true;
      return pathname === STOCK_PRICE_PATH
        ? makeStockItems()
        : makeIndexItems();
    },
    now: NOW,
    minimumStockRows: 10,
    onFallback: () => {},
  });

  assert.equal(publicApiCalled, true);
  assert.equal(snapshot.source, "supabase+public-api");
  assert.equal(snapshot.isMock, false);
  assert.equal(snapshot.hasExampleData, false);
  assert.equal(snapshot.asOf, "2026.07.30 종가");
  assert.equal(snapshot.dataDate, "2026-07-30");
  assert.equal(snapshot.stocks.length, 12);
  assert.equal(snapshot.stocks[0].price, 10000);
  assert.equal(
    snapshot.stocks.find((stock) => stock.code === "000006").changePercent,
    2,
  );
  assert.equal(snapshot.rankings.gainers[0].changePercent, 10);
  assert.equal(snapshot.indices.length, 2);
  assert.equal(snapshot.sectors.length, 8);
  assert.equal(snapshot.themes.length, 3);
  assert.deepEqual(snapshot.marketBreadth, {
    totalStocks: 12,
    stocksUpThreePercent: 6,
  });
  assert.match(snapshot.dataNotice, /종목 시세는 Supabase/);
  assert.match(snapshot.dataNotice, /지수·시장 열기·업종·테마는 공공데이터/);
});

test("Supabase 행의 기준일이 섞이면 표시 데이터 생성을 거부한다", () => {
  const rows = makeSupabaseRows();
  rows[0] = { ...rows[0], trade_date: "2026-07-29" };

  assert.throws(
    () => buildSupabaseMarketSnapshot({ tradeDate: "2026-07-30", rows }),
    /기준일이 섞여 있습니다/,
  );
});

test("Supabase 조회가 실패하면 기존 공공데이터 API를 사용한다", async () => {
  const snapshot = await getDashboardSnapshot({
    fetchSupabase: async () => {
      throw new Error("Supabase empty");
    },
    fetchItems: async (pathname) =>
      pathname === STOCK_PRICE_PATH ? makeStockItems() : makeIndexItems(),
    now: NOW,
    minimumStockRows: 10,
    onFallback: () => {},
  });

  assert.equal(snapshot.source, "public-api");
  assert.equal(snapshot.isMock, false);
  assert.match(snapshot.dataNotice, /Supabase 조회 실패/);
  assert.match(snapshot.dataNotice, /Supabase empty/);
});

test("공공데이터 조회만 실패하면 네 영역을 유지하도록 시장 지표 예시를 쓴다", async () => {
  const snapshot = await getDashboardSnapshot({
    fetchSupabase: async () => ({
      tradeDate: "2026-07-30",
      rows: makeSupabaseRows(),
    }),
    fetchItems: async () => {
      throw new Error("public API unavailable");
    },
    now: NOW,
    onFallback: () => {},
  });

  assert.equal(snapshot.source, "supabase+example");
  assert.equal(snapshot.isMock, false);
  assert.equal(snapshot.hasExampleData, true);
  assert.equal(snapshot.stocks.length, 12);
  assert.equal(snapshot.indices.length, 2);
  assert.equal(snapshot.sectors.length, 8);
  assert.equal(snapshot.themes.length, 3);
  assert.match(snapshot.dataNotice, /시장 지표/);
  assert.match(snapshot.dataNotice, /예시/);
});

test("Supabase와 기존 API가 모두 실패할 때만 예시 데이터를 안내한다", async () => {
  const snapshot = await getDashboardSnapshot({
    fetchSupabase: async () => {
      throw new Error("Supabase unavailable");
    },
    fetchItems: async () => {
      throw new Error("public API unavailable");
    },
    now: NOW,
    onFallback: () => {},
  });

  assert.equal(snapshot.source, "example");
  assert.equal(snapshot.isMock, true);
  assert.match(snapshot.dataNotice, /예시 데이터/);
  assert.match(snapshot.dataNotice, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(snapshot.dataNotice, /테이블 이름/);
});
