import { marketSnapshot as mockMarketSnapshot } from "../data/marketSnapshot.js";
import {
  fetchDataGoKrItems,
  MARKET_INDEX_PATH,
  STOCK_PRICE_PATH,
} from "./dataGoKr.js";

const MARKET_CATEGORIES = new Set(["KOSPI", "KOSDAQ"]);
const RANKING_SIZE = 5;
const MINIMUM_COMPLETE_STOCK_ROWS = 1_000;
const MAX_DATA_AGE_DAYS = 7;

export const SECTOR_INDEX_MAPPING = [
  { name: "반도체", indexName: "KRX 반도체" },
  { name: "자동차", indexName: "KRX 자동차" },
  { name: "은행", indexName: "KRX 은행" },
  { name: "증권", indexName: "KRX 증권" },
  { name: "건설", indexName: "KRX 건설" },
  { name: "철강", indexName: "KRX 철강" },
  { name: "운송", indexName: "KRX 운송" },
  { name: "방송통신", indexName: "KRX 방송통신" },
  { name: "조선", indexName: null },
  { name: "게임", indexName: null },
  { name: "2차전지", indexName: null },
  { name: "화장품", indexName: null },
];

function toFiniteNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function latestDate(items) {
  return items.reduce((latest, item) => {
    const date = String(item?.basDt ?? "");
    return date > latest ? date : latest;
  }, "");
}

function koreaCalendarDay(date) {
  const koreaTime = new Date(date.getTime() + 9 * 60 * 60 * 1_000);
  return Date.UTC(
    koreaTime.getUTCFullYear(),
    koreaTime.getUTCMonth(),
    koreaTime.getUTCDate(),
  );
}

function marketCalendarDay(basDt) {
  if (!/^\d{8}$/.test(basDt)) return Number.NaN;
  return Date.UTC(
    Number(basDt.slice(0, 4)),
    Number(basDt.slice(4, 6)) - 1,
    Number(basDt.slice(6, 8)),
  );
}

export function isMarketDataStale(basDt, now = new Date()) {
  const ageInDays =
    (koreaCalendarDay(now) - marketCalendarDay(basDt)) / (24 * 60 * 60 * 1_000);
  return !Number.isFinite(ageInDays) || ageInDays < 0 || ageInDays > MAX_DATA_AGE_DAYS;
}

function formatMarketDate(basDt) {
  return `${basDt.slice(0, 4)}.${basDt.slice(4, 6)}.${basDt.slice(6, 8)} 종가`;
}

function findIndex(items, name, category) {
  const item = items.find(
    (candidate) => candidate.idxNm === name && candidate.idxCsf === category,
  );
  const value = toFiniteNumber(item?.clpr);
  const change = toFiniteNumber(item?.vs);
  const changePercent = toFiniteNumber(item?.fltRt);

  if (!item || value === null || change === null || changePercent === null) {
    throw new Error(`${name} 지수 응답이 비어 있거나 올바르지 않습니다.`);
  }

  return { value, change, changePercent };
}

function buildRankings(stocks) {
  const rows = stocks
    .map((stock) => ({
      name: String(stock.itmsNm ?? "").trim(),
      price: toFiniteNumber(stock.clpr),
      changePercent: toFiniteNumber(stock.fltRt),
      turnoverInWon: toFiniteNumber(stock.trPrc),
    }))
    .filter(
      (row) =>
        row.name &&
        row.price !== null &&
        row.changePercent !== null &&
        row.turnoverInWon !== null,
    );

  const toRow = ({ name, price, changePercent, turnoverInWon }) => ({
    name,
    price,
    changePercent,
    turnover: turnoverInWon / 100_000_000,
  });
  const byName = (a, b) => a.name.localeCompare(b.name, "ko");

  const gainers = rows
    .filter((row) => row.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent || byName(a, b))
    .slice(0, RANKING_SIZE)
    .map(toRow);
  const losers = rows
    .filter((row) => row.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent || byName(a, b))
    .slice(0, RANKING_SIZE)
    .map(toRow);
  const turnover = rows
    .sort((a, b) => b.turnoverInWon - a.turnoverInWon || byName(a, b))
    .slice(0, RANKING_SIZE)
    .map(toRow);

  if (
    gainers.length < RANKING_SIZE ||
    losers.length < RANKING_SIZE ||
    turnover.length < RANKING_SIZE
  ) {
    throw new Error("종목 순위를 완성할 만큼 주식시세 응답이 충분하지 않습니다.");
  }

  return { gainers, losers, turnover };
}

function buildStocks(stocks) {
  const stockByCode = new Map();

  stocks.forEach((stock) => {
    const name = String(stock.itmsNm ?? "").trim();
    const code = String(stock.srtnCd ?? stock.isinCd ?? name).trim();
    const price = toFiniteNumber(stock.clpr);
    const changePercent = toFiniteNumber(stock.fltRt);

    if (!name || !code || price === null || changePercent === null) return;

    stockByCode.set(code, { code, name, price, changePercent });
  });

  return [...stockByCode.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "ko"),
  );
}

export function buildMarketSnapshot({
  stockItems,
  indexItems,
  now = new Date(),
  minimumStockRows = MINIMUM_COMPLETE_STOCK_ROWS,
}) {
  const stockDate = latestDate(stockItems);
  const indexDate = latestDate(indexItems);

  if (!stockDate || !indexDate) {
    throw new Error("공공데이터포털 응답이 비어 있습니다.");
  }
  if (stockDate !== indexDate) {
    throw new Error("주식시세와 지수시세의 최신 기준일이 일치하지 않습니다.");
  }
  if (isMarketDataStale(stockDate, now)) {
    throw new Error("공공데이터포털의 최신 데이터가 허용 범위보다 오래됐습니다.");
  }

  const stocks = stockItems.filter(
    (item) => item.basDt === stockDate && MARKET_CATEGORIES.has(item.mrktCtg),
  );
  const indices = indexItems.filter((item) => item.basDt === indexDate);

  if (stocks.length < minimumStockRows) {
    throw new Error("최신 거래일의 주식시세 응답이 불완전합니다.");
  }

  const breadthStocks = stocks.filter(
    (stock) => toFiniteNumber(stock.fltRt) !== null,
  );
  if (!breadthStocks.length) {
    throw new Error("시장 열기를 계산할 종목 등락률이 없습니다.");
  }

  const sectors = SECTOR_INDEX_MAPPING.map(({ name, indexName }) => {
    if (!indexName) {
      return { name, changePercent: null, available: false };
    }

    const index = findIndex(indices, indexName, "KRX시리즈");
    return {
      name,
      changePercent: index.changePercent,
      available: true,
      sourceIndexName: indexName,
    };
  });

  return {
    asOf: formatMarketDate(stockDate),
    dataDate: stockDate,
    isMock: false,
    indices: [
      {
        code: "KOSPI",
        name: "KOSPI",
        ...findIndex(indices, "코스피", "KOSPI시리즈"),
      },
      {
        code: "KOSDAQ",
        name: "KOSDAQ",
        ...findIndex(indices, "코스닥", "KOSDAQ시리즈"),
      },
    ],
    marketBreadth: {
      totalStocks: breadthStocks.length,
      stocksUpThreePercent: breadthStocks.filter(
        (stock) => toFiniteNumber(stock.fltRt) >= 3,
      ).length,
    },
    sectors,
    stocks: buildStocks(stocks),
    rankings: buildRankings(stocks),
  };
}

export async function getMarketSnapshot({
  fetchItems = fetchDataGoKrItems,
  now = new Date(),
  onFallback = (error) => console.error("실데이터 수집 실패, 예시 데이터 사용:", error.message),
} = {}) {
  try {
    const [stockItems, indexItems] = await Promise.all([
      fetchItems(STOCK_PRICE_PATH, { pageNo: 1, numOfRows: 4_000 }),
      fetchItems(MARKET_INDEX_PATH, { pageNo: 1, numOfRows: 1_000 }),
    ]);

    return buildMarketSnapshot({ stockItems, indexItems, now });
  } catch (error) {
    onFallback(error);
    return mockMarketSnapshot;
  }
}
