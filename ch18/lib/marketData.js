import { marketSnapshot } from '../data/marketSnapshot.js';

// 정확한 명칭과 분류로만 매핑한다. 화장품은 공식 대응 지수 미확인.
export const sectorIndices = [
  ['반도체', 'KRX 반도체'], ['자동차', 'KRX 자동차'],
  ['은행', 'KRX 은행'], ['증권', 'KRX 증권'],
  ['건설', 'KRX 건설'], ['철강', 'KRX 철강'],
  ['운송', 'KRX 운송'], ['방송통신', 'KRX 방송통신'],
  ['조선', 'KRX 조선 TOP10 지수', '테마지수'],
  ['게임', 'KRX 게임 TOP 10 지수', '테마지수'],
  ['2차전지', 'KRX 2차전지 TOP 10 지수', '테마지수'], ['화장품', null],
];

function number(value) {
  if (value == null || String(value).trim() === '' || !Number.isFinite(Number(value))) {
    throw new Error('유효하지 않은 시세 값');
  }
  return Number(value);
}

export function buildMarketSnapshot(indexRows, stockRows) {
  const date = indexRows.map(row => row.basDt).sort().at(-1);
  if (!/^\d{8}$/.test(date)) throw new Error('기준일 누락');
  const current = indexRows.filter(row => row.basDt === date);
  const indices = [['KOSPI', '코스피', 'KOSPI시리즈'], ['KOSDAQ', '코스닥', 'KOSDAQ시리즈']].map(([code, name, category]) => {
    const history = indexRows.filter(row => row.idxNm === name && row.idxCsf === category)
      .sort((a, b) => a.basDt.localeCompare(b.basDt));
    const row = history.at(-1);
    if (!row || row.basDt !== date) throw new Error('주요 지수 누락');
    const closes = history.map(item => number(item.clpr));
    return { code, name: code, value: number(row.clpr), change: number(row.vs),
      changePercent: number(row.fltRt), intraday: closes.length > 1 ? closes : [closes[0], closes[0]],
      trendLabel: `${code} 최근 일별 종가 흐름` };
  });
  const sectors = sectorIndices.flatMap(([name, indexName, category = 'KRX시리즈']) => {
    if (!indexName) return [];
    const row = current.find(item => item.idxCsf === category && item.idxNm === indexName);
    if (!row || row.fltRt == null || String(row.fltRt).trim() === '' || !Number.isFinite(Number(row.fltRt))) return [];
    return [{ name, changePercent: number(row.fltRt), indexName, category }];
  });
  if (!sectors.length) throw new Error('업종 지수 누락');
  if (!stockRows.length || stockRows.some(row => row.basDt !== date)) throw new Error('종목 기준일 불일치');
  const stocks = stockRows.filter(row => ['KOSPI', 'KOSDAQ', 'KONEX'].includes(row.mrktCtg))
    .map(row => ({ code: row.srtnCd, name: row.itmsNm, price: number(row.clpr),
      changePercent: number(row.fltRt), turnover: number(row.trPrc) / 100000000 }));
  if (!stocks.length || new Set(stocks.map(row => row.code)).size !== stocks.length) throw new Error('종목 누락 또는 중복');
  return {
    ...buildStockSnapshot(stocks),
    asOf: `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6, 8)} 종가`,
    indices, sectors,
  };
}

export function buildStockSnapshot(stocks) {
  if (!stocks.length || new Set(stocks.map(row => row.code)).size !== stocks.length) throw new Error('종목 누락 또는 중복');
  const ranked = compare => [...stocks].sort(compare).slice(0, 5);
  return {
    isMock: false, indices: [], sectors: [], stocks,
    marketBreadth: { totalStocks: stocks.length, stocksUpThreePercent: stocks.filter(row => row.changePercent >= 3).length },
    rankings: {
      gainers: ranked((a, b) => b.changePercent - a.changePercent),
      losers: ranked((a, b) => a.changePercent - b.changePercent),
      turnover: ranked((a, b) => b.turnover - a.turnover),
    },
  };
}

export function buildDailyPriceSnapshot({ date, rows }) {
  const stocks = rows.map(row => {
    if (row.trade_date !== date || !row.stock_code?.trim() || !row.stock_name?.trim()) throw new Error('유효하지 않은 종목');
    const price = number(row.close_price);
    const turnover = number(row.trading_value) / 100000000;
    if (price < 0 || turnover < 0) throw new Error('음수 시세');
    return { code: row.stock_code, name: row.stock_name, price,
      changePercent: number(row.change_percent), turnover };
  });
  return { ...buildStockSnapshot(stocks), asOf: `${date.replaceAll('-', '.')} 종가`, source: 'supabase' };
}

export async function loadMarketSnapshot(request, readDailyPrices) {
  let stockSnapshot;
  if (readDailyPrices) {
    try {
      stockSnapshot = buildDailyPriceSnapshot(await readDailyPrices());
    } catch {
      // 설정 누락, 빈 테이블, 읽기 실패 또는 불완전한 시세는 기존 API로 복귀한다.
    }
  }
  const market = await loadApiMarketSnapshot(request);
  if (!stockSnapshot) return market;
  return {
    ...market,
    stocks: stockSnapshot.stocks,
    rankings: stockSnapshot.rankings,
    asOf: stockSnapshot.asOf,
    source: stockSnapshot.source,
    isMock: false,
    marketIsMock: market.isMock,
    marketAsOf: market.asOf,
  };
}

async function loadApiMarketSnapshot(request) {
  try {
    // 최근 전체 지수와 여러 영업일의 종가를 한 번에 가져온다.
    const indexBody = await request('GetMarketIndexInfoService/getStockMarketIndex', { numOfRows: '1000' });
    const indexRows = indexBody.items.item;
    if (!Array.isArray(indexRows) || !indexRows.length) throw new Error('지수 응답 누락');
    const date = indexRows.map(row => row.basDt).sort().at(-1);
    // 최신 날짜의 지수 목록이 페이지 경계에서 잘렸다면 부분 데이터를 사용하지 않는다.
    if (Number(indexBody.totalCount) > indexRows.length && indexRows.every(row => row.basDt === date)) throw new Error('지수 목록 불완전');
    const stocks = [];
    let total = 0;
    for (let pageNo = 1; pageNo <= 20; pageNo++) {
      const body = await request('GetStockSecuritiesInfoService/getStockPriceInfo', { basDt: date, numOfRows: '5000', pageNo: String(pageNo) });
      total = number(body.totalCount);
      const rows = body.items?.item;
      if (!Array.isArray(rows) || !rows.length) throw new Error('종목 응답 누락');
      stocks.push(...rows);
      if (stocks.length >= total) break;
    }
    if (stocks.length !== total) throw new Error('전체 종목 수 불일치');
    return buildMarketSnapshot(indexRows, stocks);
  } catch {
    return marketSnapshot;
  }
}
