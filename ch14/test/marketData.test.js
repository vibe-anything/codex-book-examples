import test from "node:test";
import assert from "node:assert/strict";
import {
  INDEX_ENDPOINT,
  SECTOR_SPECS,
  STOCK_ENDPOINT,
  buildMarketSnapshot,
  getMarketSnapshot,
} from "../lib/marketData.js";

const INDEX_DATE = "20260730";
const STOCK_DATE = "20260731";

function makeIndexItems(basDt = INDEX_DATE) {
  const cards = [
    { basDt, idxCsf: "KOSPI시리즈", idxNm: "코스피", clpr: "5593.56", vs: "-69.68", fltRt: "-1.23" },
    { basDt, idxCsf: "KOSDAQ시리즈", idxNm: "코스닥", clpr: "644.78", vs: "-17.9", fltRt: "-2.7" },
  ];
  const sectors = SECTOR_SPECS.filter((spec) => spec.source).map((spec, index) => ({
    basDt,
    ...spec.source,
    clpr: String(1000 + index),
    vs: String(index - 3),
    fltRt: String((index - 3) / 10),
  }));
  const forbiddenThemes = [
    { basDt, idxCsf: "테마지수", idxNm: "KRX 조선 TOP10 지수", clpr: "1", vs: "1", fltRt: "9.1" },
    { basDt, idxCsf: "테마지수", idxNm: "KRX 게임 TOP 10 지수", clpr: "1", vs: "1", fltRt: "8.2" },
    { basDt, idxCsf: "테마지수", idxNm: "KRX 2차전지 TOP 10 지수", clpr: "1", vs: "1", fltRt: "7.3" },
  ];

  return [...cards, ...sectors, ...forbiddenThemes];
}

function makeStockItems(basDt = STOCK_DATE) {
  const changes = [30, 20, 10, 4, 3, 0, -1, -2, -3, -4, -5, -6];
  return changes.map((changePercent, index) => ({
    basDt,
    srtnCd: String(100000 + index),
    itmsNm: `테스트종목${index + 1}`,
    mrktCtg: index % 2 === 0 ? "KOSPI" : "KOSDAQ",
    clpr: String(10000 + index * 100),
    fltRt: String(changePercent),
    trPrc: String((index + 1) * 100_000_000),
  }));
}

function response(items) {
  return {
    response: {
      header: { resultCode: "00", resultMsg: "NORMAL SERVICE." },
      body: {
        totalCount: items.length,
        items: items.length > 0 ? { item: items } : undefined,
      },
    },
  };
}

function makeSuccessfulFetch() {
  const indexItems = makeIndexItems();
  const stockItems = makeStockItems();

  return async (endpoint, params) => {
    if (endpoint === INDEX_ENDPOINT) {
      return response(params.basDt ? indexItems : [indexItems[0]]);
    }
    if (endpoint === STOCK_ENDPOINT) {
      return response(params.basDt ? stockItems : [stockItems[0]]);
    }
    throw new Error("unexpected endpoint");
  };
}

test("합의한 12개 업종 목록을 보존하고 정확한 업종 지수 8개만 연결한다", () => {
  assert.deepEqual(
    SECTOR_SPECS.map((spec) => spec.name),
    ["반도체", "자동차", "은행", "증권", "건설", "철강", "운송", "방송통신", "조선", "게임", "2차전지", "화장품"]
  );
  assert.equal(SECTOR_SPECS.filter((spec) => spec.source).length, 8);

  const snapshot = buildMarketSnapshot({
    indexBasDt: INDEX_DATE,
    stockBasDt: STOCK_DATE,
    indexItems: makeIndexItems(),
    stockItems: makeStockItems(),
  });

  assert.deepEqual(
    snapshot.sectors.map((sector) => sector.name),
    ["반도체", "자동차", "은행", "증권", "건설", "철강", "운송", "방송통신"]
  );
  assert.ok(snapshot.sectors.every((sector) => !sector.sourceIndexName.includes("TOP")));
  assert.ok(snapshot.sectors.every((sector) => !sector.sourceIndexName.includes("300")));
});

test("실제 응답 필드로 지수·시장 열기·종목 순위를 만들고 서로 다른 기준일을 표시한다", async () => {
  const snapshot = await getMarketSnapshot({ fetchJson: makeSuccessfulFetch(), timeoutMs: 100 });

  assert.equal(snapshot.isMock, false);
  assert.equal(snapshot.asOf, "지수 2026.07.30 · 종목 2026.07.31");
  assert.equal(snapshot.indices[0].value, 5593.56);
  assert.equal("intraday" in snapshot.indices[0], false);
  assert.equal(snapshot.stocks.length, 12);
  assert.deepEqual(snapshot.stocks[0], {
    code: "100000",
    market: "KOSPI",
    name: "테스트종목1",
    price: 10000,
    changePercent: 30,
    turnover: 100_000_000,
  });
  assert.deepEqual(snapshot.marketBreadth, { totalStocks: 12, stocksUpThreePercent: 5 });
  assert.equal(snapshot.rankings.gainers[0].changePercent, 30);
  assert.equal(snapshot.rankings.losers[0].changePercent, -6);
  assert.equal(snapshot.rankings.turnover[0].turnover, 1_200_000_000);
});

test("API 오류와 빈 응답은 표시 가능한 예시 데이터로 대체한다", async () => {
  const failed = await getMarketSnapshot({
    fetchJson: async () => { throw new Error("network down"); },
    timeoutMs: 100,
  });
  assert.equal(failed.isMock, true);
  assert.match(failed.dataNotice, /network down/);
  assert.equal(failed.indices.length, 2);
  assert.equal(failed.sectors.length, 8);
  assert.equal(failed.stocks.length, 15);

  const empty = await getMarketSnapshot({
    fetchJson: async () => response([]),
    timeoutMs: 100,
  });
  assert.equal(empty.isMock, true);
  assert.match(empty.dataNotice, /빈 응답/);
  assert.equal(empty.rankings.turnover.length, 5);
});

test("갱신 요청이 멈춰도 제한 시간 뒤 예시 데이터로 복구한다", async () => {
  const startedAt = Date.now();
  const snapshot = await getMarketSnapshot({
    fetchJson: async () => new Promise(() => {}),
    timeoutMs: 10,
  });

  assert.equal(snapshot.isMock, true);
  assert.match(snapshot.dataNotice, /시간 초과/);
  assert.ok(Date.now() - startedAt < 500);
});
