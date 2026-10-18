import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMarketSnapshot, loadMarketSnapshot, sectorIndices } from '../lib/marketData.js';
import { marketSnapshot } from '../data/marketSnapshot.js';

const date = '20261015';
const indices = [
  { basDt: date, idxNm: '코스피', idxCsf: 'KOSPI시리즈', clpr: '2000', vs: '-20', fltRt: '-1' },
  { basDt: date, idxNm: '코스닥', idxCsf: 'KOSDAQ시리즈', clpr: '700', vs: '7', fltRt: '1' },
  ...sectorIndices.filter(([, name]) => name).map(([, name]) => ({ basDt: date, idxNm: name, idxCsf: 'KRX시리즈', fltRt: '-.32' })),
  { basDt: date, idxNm: 'KRX 조선 TOP10 지수', idxCsf: '테마지수', fltRt: '10' },
  { basDt: date, idxNm: 'KRX 게임 TOP 10 지수', idxCsf: '테마지수', fltRt: '20' },
];
const stocks = [
  { basDt: date, srtnCd: '1', itmsNm: '상승', mrktCtg: 'KOSPI', clpr: '1000', fltRt: '3', trPrc: '200000000' },
  { basDt: date, srtnCd: '2', itmsNm: '하락', mrktCtg: 'KOSDAQ', clpr: '2000', fltRt: '-5', trPrc: '900000000' },
];

test('실제 시세의 단위, 순위, 시장 열기와 8개 KRX 업종을 변환한다', () => {
  const result = buildMarketSnapshot(indices, stocks);
  assert.equal(result.isMock, false);
  assert.equal(result.asOf, '2026.10.15 종가');
  assert.deepEqual(result.sectors.map(row => row.name), marketSnapshot.sectors.slice(0, 8).map(row => row.name));
  assert.equal(result.sectors[0].changePercent, -0.32);
  assert.deepEqual(result.marketBreadth, { totalStocks: 2, stocksUpThreePercent: 1 });
  assert.equal(result.rankings.gainers[0].name, '상승');
  assert.equal(result.rankings.losers[0].name, '하락');
  assert.equal(result.rankings.turnover[0].turnover, 9);
  assert.equal(result.indices[0].value, 2000);
});

test('업종의 누락, 빈 값, 다른 시리즈를 다른 지수나 예시 값으로 대체하지 않는다', () => {
  const changed = indices.map(row => row.idxNm === 'KRX 반도체' ? { ...row, idxCsf: '테마지수' }
    : row.idxNm === 'KRX 은행' ? { ...row, fltRt: '' } : row);
  const result = buildMarketSnapshot(changed, stocks);
  assert.equal(result.sectors.length, 6);
  assert.ok(!result.sectors.some(row => ['반도체', '은행', '조선', '게임', '2차전지', '화장품'].includes(row.name)));
});

test('관심 종목 검색에는 순위 밖 종목을 포함한 전체 수집 시세를 제공한다', () => {
  const rows = Array.from({ length: 7 }, (_, index) => ({
    ...stocks[0], srtnCd: String(index), itmsNm: `종목${index}`,
    fltRt: String(index), trPrc: String((index + 1) * 100000000),
  }));
  const result = buildMarketSnapshot(indices, rows);
  assert.equal(result.rankings.gainers.length, 5);
  assert.equal(result.stocks.length, 7);
  assert.deepEqual(result.stocks.find(stock => stock.code === '0'), {
    code: '0', name: '종목0', price: 1000, changePercent: 0, turnover: 1,
  });
});

test('지수 그래프는 날짜순 실제 종가를 사용한다', () => {
  const result = buildMarketSnapshot([...indices, { ...indices[0], basDt: '20261014', clpr: '2020' }], stocks);
  assert.deepEqual(result.indices[0].intraday, [2020, 2000]);
  assert.match(result.indices[0].trendLabel, /일별 종가/);
});

test('종목 페이지를 모두 받아 기준일을 맞춘다', async () => {
  const calls = [];
  const result = await loadMarketSnapshot(async (path, params) => {
    calls.push([path, params]);
    return path.includes('Index') ? { totalCount: indices.length, items: { item: indices } }
      : { totalCount: 2, items: { item: [stocks[Number(params.pageNo) - 1]] } };
  });
  assert.equal(result.isMock, false);
  assert.equal(calls.length, 3);
  assert.equal(calls[1][1].basDt, date);
});

test('통신 오류, 빈 응답, 기준일 불일치, 잘못된 숫자는 전체 예시 데이터로 복귀한다', async () => {
  assert.equal(await loadMarketSnapshot(async () => { throw new Error('timeout'); }), marketSnapshot);
  assert.equal(await loadMarketSnapshot(async () => ({ items: { item: [] } })), marketSnapshot);
  for (const rows of [[{ ...stocks[0], basDt: '20261014' }], [{ ...stocks[0], clpr: '' }]]) {
    assert.equal(await loadMarketSnapshot(async path => path.includes('Index')
      ? { totalCount: indices.length, items: { item: indices } }
      : { totalCount: rows.length, items: { item: rows } }), marketSnapshot);
  }
});
