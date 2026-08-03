import test from "node:test";
import assert from "node:assert/strict";
import {
  DAILY_QUOTES_TABLE,
  fetchLatestDailyQuotes,
} from "../lib/supabaseMarketData.js";

function response(rows, contentRange = "") {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name) =>
        name.toLowerCase() === "content-range" ? contentRange : null,
    },
    json: async () => rows,
  };
}

test("최신 기준일을 찾은 뒤 그 날짜의 시세만 GET으로 읽는다", async () => {
  const calls = [];
  const quoteRows = [
    {
      trade_date: "2026-07-30",
      stock_code: "005930",
      stock_name: "삼성전자",
      close_price: "73200",
      change_rate: "1.81",
      trading_value: "1482000000000",
    },
  ];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1
      ? response([{ trade_date: "2026-07-30" }])
      : response(quoteRows, "0-0/1");
  };

  const result = await fetchLatestDailyQuotes({
    fetchImpl,
    supabaseUrl: "https://example.supabase.co",
    publishableKey: "sb_publishable_test",
    timeoutMs: 100,
  });

  assert.deepEqual(result, { tradeDate: "2026-07-30", rows: quoteRows });
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.options.method === "GET"));
  assert.ok(
    calls.every(
      (call) => call.options.headers.apikey === "sb_publishable_test",
    ),
  );
  assert.ok(
    calls.every((call) => !("Authorization" in call.options.headers)),
  );
  assert.equal(
    new URL(calls[0].url).pathname,
    `/rest/v1/${DAILY_QUOTES_TABLE}`,
  );
  assert.equal(
    new URL(calls[0].url).searchParams.get("order"),
    "trade_date.desc",
  );
  assert.equal(
    new URL(calls[1].url).searchParams.get("trade_date"),
    "eq.2026-07-30",
  );
});

test("최신 기준일 시세가 1,000행을 넘으면 다음 페이지도 읽는다", async () => {
  const rows = Array.from({ length: 1_001 }, (_, index) => ({
    trade_date: "2026-07-30",
    stock_code: String(index).padStart(6, "0"),
    stock_name: `종목${index}`,
    close_price: "1000",
    change_rate: "0",
    trading_value: "1000000",
  }));
  const offsets = [];
  const fetchImpl = async (url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.searchParams.get("select") === "trade_date") {
      return response([{ trade_date: "2026-07-30" }]);
    }

    const offset = Number(parsedUrl.searchParams.get("offset"));
    offsets.push(offset);
    const pageRows = rows.slice(offset, offset + 1_000);
    const end = offset + pageRows.length - 1;
    return response(pageRows, `${offset}-${end}/1001`);
  };

  const result = await fetchLatestDailyQuotes({
    fetchImpl,
    supabaseUrl: "https://example.supabase.co",
    publishableKey: "sb_publishable_test",
    timeoutMs: 100,
  });

  assert.equal(result.rows.length, 1_001);
  assert.deepEqual(offsets, [0, 1_000]);
});

test("Supabase에 데이터가 없으면 폴백할 수 있도록 오류를 낸다", async () => {
  await assert.rejects(
    fetchLatestDailyQuotes({
      fetchImpl: async () => response([]),
      supabaseUrl: "https://example.supabase.co",
      publishableKey: "sb_publishable_test",
      timeoutMs: 100,
    }),
    /데이터가 없습니다/,
  );
});
