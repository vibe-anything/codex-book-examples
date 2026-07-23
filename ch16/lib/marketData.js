import { fetchDataGoKrJson } from "./dataGoKr.js";
import { exampleMarketData } from "./exampleMarketData.js";
import { fetchLatestDailyStockPriceItems } from "./priceStore.js";

const INDEX_ENDPOINT =
  "https://apis.data.go.kr/1160100/service/GetMarketIndexInfoService/getStockMarketIndex";
const STOCK_ENDPOINT =
  "https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo";
const LISTED_ENDPOINT =
  "https://apis.data.go.kr/1160100/service/GetKrxListedInfoService/getItemInfo";

const TARGET_MARKETS = new Set(["KOSPI", "KOSDAQ"]);
const STRONG_GAIN_THRESHOLD = 3;
const INDEX_ROWS_PER_DAY = 1000;
const STOCK_ROWS_PER_DAY = 5000;
const LISTED_ROWS_PER_DAY = 5000;
const DISCOVERY_ROWS = 100;

const INDEX_CARD_MAP = [
  { name: "KOSPI", idxCsf: "KOSPI시리즈", idxNm: "코스피", market: "KOSPI" },
  { name: "KOSDAQ", idxCsf: "KOSDAQ시리즈", idxNm: "코스닥", market: "KOSDAQ" },
];

const SECTOR_INDEX_MAP = [
  { name: "반도체", idxCsf: "KRX시리즈", idxNm: "KRX 반도체" },
  { name: "자동차", idxCsf: "KRX시리즈", idxNm: "KRX 자동차" },
  { name: "금융", idxCsf: "KRX시리즈", idxNm: "KRX 300 금융" },
  { name: "헬스케어", idxCsf: "KRX시리즈", idxNm: "KRX 헬스케어" },
  { name: "유통", idxCsf: "KOSPI시리즈", idxNm: "유통" },
  { name: "방송통신", idxCsf: "KRX시리즈", idxNm: "KRX 방송통신" },
  { name: "오락·문화", idxCsf: "KOSPI시리즈", idxNm: "오락·문화" },
  { name: "건설", idxCsf: "KRX시리즈", idxNm: "KRX 건설" },
];

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function readItems(json) {
  return toArray(json?.response?.body?.items?.item);
}

function assertNormalResponse(json, sourceName) {
  const header = json?.response?.header;

  if (header?.resultCode !== "00") {
    throw new Error(
      `${sourceName} request failed: ${header?.resultCode ?? "UNKNOWN"} ${
        header?.resultMsg ?? ""
      }`.trim()
    );
  }
}

async function fetchItems(fetchJson, endpoint, params, sourceName) {
  const json = await fetchJson(
    endpoint,
    params,
    { cache: "no-store" }
  );

  assertNormalResponse(json, sourceName);
  return readItems(json);
}

async function fetchLatestItems(fetchJson, endpoint, sourceName, rowsPerDay) {
  const discoveryItems = await fetchItems(
    fetchJson,
    endpoint,
    {
      numOfRows: DISCOVERY_ROWS,
      pageNo: 1,
      resultType: "json",
    },
    sourceName
  );
  const basDt = getLatestBasDt(discoveryItems, sourceName);
  const items = await fetchItems(
    fetchJson,
    endpoint,
    {
      numOfRows: rowsPerDay,
      pageNo: 1,
      resultType: "json",
      basDt,
    },
    sourceName
  );

  requireItems(items, sourceName);
  return { basDt, items };
}

async function fetchLatestIndexItems(fetchJson) {
  return fetchLatestItems(
    fetchJson,
    INDEX_ENDPOINT,
    "Market index",
    INDEX_ROWS_PER_DAY
  );
}

async function fetchListedItems(fetchJson, basDt) {
  return fetchItems(
    fetchJson,
    LISTED_ENDPOINT,
    {
      numOfRows: LISTED_ROWS_PER_DAY,
      pageNo: 1,
      resultType: "json",
      basDt,
    },
    "Listed item"
  );
}

function requireItems(items, sourceName) {
  if (items.length === 0) {
    throw new Error(`${sourceName} returned no items.`);
  }
}

function parseNumber(value) {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number(String(value).replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value, options = {}) {
  return new Intl.NumberFormat("ko-KR", options).format(value);
}

function formatDecimal(value, digits = 2) {
  return formatNumber(value, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatSignedDecimal(value, digits = 2) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatDecimal(value, digits)}`;
}

function formatKrwAmount(value) {
  const amount = parseNumber(value);

  if (amount >= 1_0000_0000_0000) {
    return `${formatNumber(amount / 1_0000_0000_0000, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}조원`;
  }

  if (amount >= 1_0000_0000) {
    return `${formatNumber(Math.round(amount / 1_0000_0000))}억원`;
  }

  if (amount >= 1_0000) {
    return `${formatNumber(Math.round(amount / 1_0000))}만원`;
  }

  return `${formatNumber(amount)}원`;
}

function formatBasDt(value) {
  if (!value || value.length !== 8) return value ?? "";
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function formatAsOfLabel({ indexBasDt, stockBasDt }) {
  const indexDate = formatBasDt(indexBasDt);
  const stockDate = formatBasDt(stockBasDt);

  if (indexBasDt === stockBasDt) {
    return `기준 ${indexDate}`;
  }

  return `기준 지수 ${indexDate} · 종목 ${stockDate}`;
}

function findIndexItem(items, { idxCsf, idxNm }) {
  return items.find((item) => item.idxCsf === idxCsf && item.idxNm === idxNm);
}

function normalizeShortCode(value) {
  return String(value ?? "").replace(/^A/i, "").toUpperCase();
}

function buildListedCodeSet(listedItems) {
  requireItems(listedItems, "Listed item");
  return new Set(listedItems.map((item) => normalizeShortCode(item.srtnCd)).filter(Boolean));
}

function summarizeStocks(stocks) {
  const summary = {
    advancers: 0,
    decliners: 0,
    unchanged: 0,
    strongAdvancers: 0,
    totalTurnover: 0,
  };

  stocks.forEach((stock) => {
    const changeRate = parseNumber(stock.fltRt);

    if (changeRate > 0) summary.advancers += 1;
    else if (changeRate < 0) summary.decliners += 1;
    else summary.unchanged += 1;

    if (changeRate >= STRONG_GAIN_THRESHOLD) summary.strongAdvancers += 1;

    summary.totalTurnover += parseNumber(stock.trPrc);
  });

  return summary;
}

function buildIndexCards(indexItems, stocks) {
  return INDEX_CARD_MAP.map((target) => {
    const item = findIndexItem(indexItems, target);

    if (!item) return null;

    const marketStocks = stocks.filter((stock) => stock.mrktCtg === target.market);
    const summary = summarizeStocks(marketStocks);

    return {
      name: target.name,
      value: formatDecimal(parseNumber(item?.clpr)),
      change: formatSignedDecimal(parseNumber(item?.vs)),
      changeRate: parseNumber(item?.fltRt),
      turnover: formatKrwAmount(item?.trPrc),
      advancers: summary.advancers,
      decliners: summary.decliners,
      unchanged: summary.unchanged,
    };
  }).filter(Boolean);
}

function buildMarketSummary(stocks) {
  const summary = summarizeStocks(stocks);
  const totalStocks = stocks.length;
  const strongAdvancerRatio =
    totalStocks > 0 ? (summary.strongAdvancers / totalStocks) * 100 : 0;

  return {
    strongGainThreshold: STRONG_GAIN_THRESHOLD,
    strongAdvancers: summary.strongAdvancers,
    strongAdvancerRatio,
    totalStocks,
    advancers: summary.advancers,
    decliners: summary.decliners,
    unchanged: summary.unchanged,
    totalTurnover: formatKrwAmount(summary.totalTurnover),
  };
}

function buildSectors(indexItems) {
  return SECTOR_INDEX_MAP.map((sector) => {
    const item = findIndexItem(indexItems, sector);

    if (!item) return null;

    return {
      name: sector.name,
      sourceLabel: item.idxCsf.replace("시리즈", ""),
      sourceIndexName: item.idxNm,
      value: formatDecimal(parseNumber(item.clpr)),
      change: formatSignedDecimal(parseNumber(item.vs)),
      changeRate: parseNumber(item.fltRt),
      turnover: formatKrwAmount(item.trPrc),
    };
  }).filter(Boolean);
}

function toStockRow(stock, index) {
  return {
    rank: index + 1,
    name: stock.itmsNm,
    market: stock.mrktCtg,
    price: formatNumber(parseNumber(stock.clpr)),
    changeRate: parseNumber(stock.fltRt),
    turnover: formatKrwAmount(stock.trPrc),
  };
}

function toStockSearchItem(stock) {
  return {
    code: normalizeShortCode(stock.srtnCd),
    name: stock.itmsNm,
    market: stock.mrktCtg,
    price: formatNumber(parseNumber(stock.clpr)),
    changeRate: parseNumber(stock.fltRt),
  };
}

function rankStocks(stocks, compare) {
  return [...stocks].sort(compare).slice(0, 5).map(toStockRow);
}

function buildTopStocks(stocks) {
  return {
    gainers: rankStocks(
      stocks,
      (a, b) => parseNumber(b.fltRt) - parseNumber(a.fltRt)
    ),
    losers: rankStocks(
      stocks,
      (a, b) => parseNumber(a.fltRt) - parseNumber(b.fltRt)
    ),
    turnover: rankStocks(
      stocks,
      (a, b) => parseNumber(b.trPrc) - parseNumber(a.trPrc)
    ),
  };
}

function buildStockSearchItems(stocks) {
  return stocks
    .map(toStockSearchItem)
    .sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));
}

function isValidTargetStock(stock) {
  return (
    TARGET_MARKETS.has(stock.mrktCtg) &&
    stock.srtnCd !== undefined &&
    stock.srtnCd !== "" &&
    stock.itmsNm !== undefined &&
    stock.itmsNm !== "" &&
    stock.clpr !== undefined &&
    stock.clpr !== "" &&
    stock.fltRt !== undefined &&
    stock.fltRt !== "" &&
    stock.trPrc !== undefined &&
    stock.trPrc !== ""
  );
}

function getLatestBasDt(items, sourceName) {
  requireItems(items, sourceName);
  return items.reduce(
    (latest, item) => (item.basDt > latest ? item.basDt : latest),
    ""
  );
}

function validateMarketData(marketData) {
  if (marketData.indices.length !== INDEX_CARD_MAP.length) {
    throw new Error("Required market index cards are incomplete.");
  }

  if (marketData.sectors.length === 0) {
    throw new Error("Sector index data is empty.");
  }

  if (
    marketData.marketSummary.totalStocks === 0 ||
    marketData.topStocks.gainers.length === 0 ||
    marketData.topStocks.losers.length === 0 ||
    marketData.topStocks.turnover.length === 0
  ) {
    throw new Error("Stock price data is empty.");
  }
}

function buildDashboardData({ indexBasDt, stockBasDt, indexItems, stocks, dataNotice }) {
  const latestIndexItems = indexItems.filter((item) => item.basDt === indexBasDt);
  requireItems(latestIndexItems, "Latest market index");
  requireItems(stocks, "Stock price");

  const marketData = {
    asOf: formatAsOfLabel({ indexBasDt, stockBasDt }),
    sourceDates: {
      index: formatBasDt(indexBasDt),
      stocks: formatBasDt(stockBasDt),
      listed: formatBasDt(stockBasDt),
    },
    dataNotice,
    indices: buildIndexCards(latestIndexItems, stocks),
    marketSummary: buildMarketSummary(stocks),
    sectors: buildSectors(latestIndexItems),
    topStocks: buildTopStocks(stocks),
    stockSearchItems: buildStockSearchItems(stocks),
  };

  validateMarketData(marketData);
  return marketData;
}

function buildMarketData({ indexBasDt, stockBasDt, indexItems, stockItems, listedItems }) {
  const listedCodes = buildListedCodeSet(listedItems);
  const stocks = stockItems
    .filter(isValidTargetStock)
    .filter((stock) => listedCodes.has(normalizeShortCode(stock.srtnCd)));

  return buildDashboardData({
    indexBasDt,
    stockBasDt,
    indexItems,
    stocks,
    dataNotice: "공공데이터포털 금융위원회 지수시세정보/주식시세정보 기준, 상장종목정보로 종목 코드 검증",
  });
}

async function getDatabaseMarketData(fetchJson) {
  const stockDiscovery = await fetchLatestDailyStockPriceItems();

  if (!stockDiscovery) return null;

  const { basDt: indexBasDt, items: indexItems } = await fetchLatestIndexItems(fetchJson);

  return buildDashboardData({
    indexBasDt,
    stockBasDt: stockDiscovery.basDt,
    indexItems,
    stocks: stockDiscovery.items,
    dataNotice: "Supabase daily_stock_prices 기준, 지수와 업종은 공공데이터포털 금융위원회 지수시세정보 기준",
  });
}

async function getLiveMarketData(fetchJson) {
  const [{ basDt: indexBasDt, items: indexItems }, stockDiscovery] = await Promise.all([
    fetchLatestIndexItems(fetchJson),
    fetchLatestItems(fetchJson, STOCK_ENDPOINT, "Stock price", STOCK_ROWS_PER_DAY),
  ]);

  const stockBasDt = stockDiscovery.basDt;
  const stockItems = stockDiscovery.items;

  requireItems(indexItems, "Market index");
  requireItems(stockItems, "Stock price");

  const listedItems = await fetchListedItems(fetchJson, stockBasDt);
  requireItems(listedItems, "Listed item");

  return buildMarketData({
    indexBasDt,
    stockBasDt,
    indexItems,
    stockItems,
    listedItems,
  });
}

export function getExampleMarketData(reason = "") {
  return {
    ...exampleMarketData,
    dataNotice: reason
      ? `${exampleMarketData.dataNotice} (${reason})`
      : exampleMarketData.dataNotice,
  };
}

export async function getMarketData({ fetchJson = fetchDataGoKrJson } = {}) {
  try {
    const databaseMarketData = await getDatabaseMarketData(fetchJson);

    if (databaseMarketData) return databaseMarketData;
  } catch {
    // Fall through to the live API path when Supabase is not configured or unavailable.
  }

  try {
    return await getLiveMarketData(fetchJson);
  } catch (error) {
    return getExampleMarketData(error.message);
  }
}
