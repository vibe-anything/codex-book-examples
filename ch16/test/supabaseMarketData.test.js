import test from 'node:test';
import assert from 'node:assert/strict';
import { readLatestDailyPrices } from '../lib/supabaseMarketData.js';
import { buildDailyPriceSnapshot, loadMarketSnapshot } from '../lib/marketData.js';
import { marketSnapshot } from '../data/marketSnapshot.js';

const date = '2026-10-15';
const row = { trade_date: date, stock_code: '005930', stock_name: '삼성전자', close_price: '70000', change_percent: '3', trading_value: '200000000' };
const reply = (rows, range = '0-0/1') => new Response(JSON.stringify(rows), { headers: { 'content-range': range } });
const options = { supabaseUrl: 'https://example.supabase.co', publishableKey: 'sb_publishable_test' };

test('최신 날짜를 고정하고 전체 종목을 GET으로 페이지 조회한다', async () => {
  const calls = [];
  const rows = Array.from({ length: 1001 }, (_, i) => ({ ...row, stock_code: String(i).padStart(6, '0') }));
  const result = await readLatestDailyPrices({ ...options, fetchImpl: async (url, init) => {
    calls.push({ url, init });
    assert.equal(init.method, 'GET');
    assert.equal(init.headers.apikey, options.publishableKey);
    assert.equal(url.pathname, '/rest/v1/daily_prices');
    if (url.searchParams.get('select') === 'trade_date') {
      assert.equal(url.searchParams.get('order'), 'trade_date.desc');
      return reply([{ trade_date: date }]);
    }
    assert.equal(url.searchParams.get('trade_date'), `eq.${date}`);
    const offset = Number(url.searchParams.get('offset'));
    return reply(rows.slice(offset, offset + 1000), `${offset}-${Math.min(offset + 999, 1000)}/1001`);
  } });
  assert.equal(calls.length, 3);
  const snapshot = buildDailyPriceSnapshot(result);
  assert.equal(snapshot.stocks.length, 1001);
  assert.equal(snapshot.asOf, '2026.10.15 종가');
  assert.equal(snapshot.rankings.turnover[0].turnover, 2);
  assert.equal(snapshot.marketBreadth.stocksUpThreePercent, 1001);
  assert.deepEqual(snapshot.indices, []);
});

test('Supabase 성공 시에도 시장 요약은 기존 API에서 읽고 종목만 대체한다', async () => {
  const calls = [];
  const indexDate = '20261014';
  const indices = [
    { basDt: indexDate, idxNm: '코스피', idxCsf: 'KOSPI시리즈', clpr: '2000', vs: '20', fltRt: '1' },
    { basDt: indexDate, idxNm: '코스닥', idxCsf: 'KOSDAQ시리즈', clpr: '700', vs: '7', fltRt: '1' },
    { basDt: indexDate, idxNm: 'KRX 반도체', idxCsf: 'KRX시리즈', fltRt: '2' },
  ];
  const result = await loadMarketSnapshot(async (path, params) => {
    calls.push(path);
    if (path.includes('Index')) return { totalCount: indices.length, items: { item: indices } };
    assert.equal(params.basDt, indexDate);
    return { totalCount: 1, items: { item: [{ basDt: indexDate, srtnCd: '000001', itmsNm: 'API 종목', mrktCtg: 'KOSPI', clpr: '1000', fltRt: '-1', trPrc: '100000000' }] } };
  }, async () => ({ date, rows: [row] }));
  assert.equal(calls.length, 2);
  assert.equal(result.source, 'supabase');
  assert.equal(result.isMock, false);
  assert.equal(result.marketIsMock, false);
  assert.equal(result.asOf, '2026.10.15 종가');
  assert.equal(result.marketAsOf, '2026.10.14 종가');
  assert.equal(result.indices[0].value, 2000);
  assert.equal(result.sectors[0].changePercent, 2);
  assert.deepEqual(result.marketBreadth, { totalStocks: 1, stocksUpThreePercent: 0 });
  assert.equal(result.stocks[0].code, row.stock_code);
  assert.equal(result.rankings.gainers[0].name, row.stock_name);
});

test('API 실패 시에도 Supabase 종목과 시장 요약 예시를 함께 유지한다', async () => {
  const result = await loadMarketSnapshot(async () => { throw new Error('API 실패'); }, async () => ({ date, rows: [row] }));
  assert.equal(result.isMock, false);
  assert.equal(result.marketIsMock, true);
  assert.equal(result.stocks[0].code, row.stock_code);
  assert.deepEqual(result.indices, marketSnapshot.indices);
  assert.deepEqual(result.sectors, marketSnapshot.sectors);
  assert.deepEqual(result.marketBreadth, marketSnapshot.marketBreadth);
});

test('빈 테이블, HTTP 오류, 불완전한 목록은 읽기 오류로 처리한다', async () => {
  for (const fetchImpl of [
    async () => reply([]),
    async () => new Response('', { status: 403 }),
    async url => url.searchParams.get('select') === 'trade_date' ? reply([{ trade_date: date }]) : reply([], '*/2'),
  ]) {
    await assert.rejects(readLatestDailyPrices({ ...options, fetchImpl }));
  }
});

test('Supabase 실패 후 API를 시도하고 둘 다 실패할 때만 예시를 반환한다', async () => {
  let attempts = 0;
  const result = await loadMarketSnapshot(async () => { attempts++; throw new Error('API 실패'); }, async () => { throw new Error('DB 실패'); });
  assert.equal(attempts, 1);
  assert.equal(result, marketSnapshot);
  await assert.rejects(readLatestDailyPrices({ supabaseUrl: '', publishableKey: '' }));
  for (const rows of [[{ ...row, close_price: '' }], [row, row], [{ ...row, trade_date: '2026-10-14' }]]) {
    assert.throws(() => buildDailyPriceSnapshot({ date, rows }));
  }
});
