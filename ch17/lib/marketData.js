import { fetchDataGoKrJson } from "./dataGoKr.js";
import {
  SUPABASE_PUBLISHABLE_KEY_ENV,
  SUPABASE_URL_ENV,
  fetchLatestDailyStockPrices,
} from "./supabaseMarketData.js";
import { exampleMarketSnapshot } from "../data/marketSnapshot.js";

export const INDEX_ENDPOINT =
  "https://apis.data.go.kr/1160100/service/GetMarketIndexInfoService/getStockMarketIndex";
export const STOCK_ENDPOINT =
  "https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo";

const INDEX_ROWS_PER_DAY = 1000;
const STOCK_ROWS_PER_DAY = 5000;
const DISCOVERY_ROWS = 100;
const DEFAULT_TIMEOUT_MS = 8000;
const STRONG_GAIN_THRESHOLD = 3;
const TARGET_MARKETS = new Set(["KOSPI", "KOSDAQ"]);

const INDEX_CARD_SPECS = [
  { code: "KOSPI", name: "KOSPI", idxCsf: "KOSPI시리즈", idxNm: "코스피" },
  { code: "KOSDAQ", name: "KOSDAQ", idxCsf: "KOSDAQ시리즈", idxNm: "코스닥" },
];

// 화면에서 합의한 12개 업종은 모두 이 목록에 남긴다. source가 null인 항목은
// 지수시세정보에 정확히 대응하는 업종 지수가 없어 화면 칸만 렌더링하지 않는다.
export const SECTOR_SPECS = [
  { name: "반도체", source: { idxCsf: "KRX시리즈", idxNm: "KRX 반도체" } },
  { name: "자동차", source: { idxCsf: "KRX시리즈", idxNm: "KRX 자동차" } },
  { name: "은행", source: { idxCsf: "KRX시리즈", idxNm: "KRX 은행" } },
  { name: "증권", source: { idxCsf: "KRX시리즈", idxNm: "KRX 증권" } },
  { name: "건설", source: { idxCsf: "KRX시리즈", idxNm: "KRX 건설" } },
  { name: "철강", source: { idxCsf: "KRX시리즈", idxNm: "KRX 철강" } },
  { name: "운송", source: { idxCsf: "KRX시리즈", idxNm: "KRX 운송" } },
  { name: "방송통신", source: { idxCsf: "KRX시리즈", idxNm: "KRX 방송통신" } },
  { name: "조선", source: null, unavailableReason: "정확한 업종 지수 없이 TOP10 테마 지수만 제공" },
  { name: "게임", source: null, unavailableReason: "정확한 업종 지수 없이 TOP 10 테마 지수만 제공" },
  { name: "2차전지", source: null, unavailableReason: "정확한 업종 지수 없이 TOP 10·K-AI 테마 지수만 제공" },
  { name: "화장품", source: null, unavailableReason: "정확히 대응하는 업종 지수를 제공하지 않음" },
];

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function readResponse(json, sourceName) {
  const header = json?.response?.header;
  if (header?.resultCode !== "00") {
    throw new Error(
      `${sourceName} 응답 오류: ${header?.resultCode ?? "UNKNOWN"} ${header?.resultMsg ?? ""}`.trim()
    );
  }

  const body = json?.response?.body;
  return {
    items: toArray(body?.items?.item),
    totalCount: Number(body?.totalCount ?? 0),
  };
}

function requireItems(items, sourceName) {
  if (items.length === 0) {
    throw new Error(`${sourceName} 빈 응답`);
  }
}

function getLatestBasDt(items, sourceName) {
  requireItems(items, sourceName);
  const basDt = items.reduce(
    (latest, item) => (String(item?.basDt ?? "") > latest ? String(item.basDt) : latest),
    ""
  );

  if (!/^\d{8}$/.test(basDt)) {
    throw new Error(`${sourceName} 기준일 누락`);
  }

  return basDt;
}

async function withTimeout(promise, timeoutMs, sourceName) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${sourceName} 응답 시간 초과`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchItems(fetchJson, endpoint, params, sourceName, timeoutMs) {
  const request = Promise.resolve().then(() =>
    fetchJson(endpoint, params, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(timeoutMs),
    })
  );
  const json = await withTimeout(request, timeoutMs, sourceName);
  return readResponse(json, sourceName);
}

async function fetchLatestItems(fetchJson, endpoint, sourceName, rowsPerDay, timeoutMs) {
  const discovery = await fetchItems(
    fetchJson,
    endpoint,
    { numOfRows: DISCOVERY_ROWS, pageNo: 1, resultType: "json" },
    `${sourceName} 최신일 탐색`,
    timeoutMs
  );
  const basDt = getLatestBasDt(discovery.items, `${sourceName} 최신일 탐색`);
  const latest = await fetchItems(
    fetchJson,
    endpoint,
    { numOfRows: rowsPerDay, pageNo: 1, resultType: "json", basDt },
    sourceName,
    timeoutMs
  );
  requireItems(latest.items, sourceName);

  if (latest.totalCount > latest.items.length) {
    throw new Error(`${sourceName} 일부 페이지만 수집됨`);
  }

  return {
    basDt,
    items: latest.items.filter((item) => item?.basDt === basDt),
  };
}

function parseNumber(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${fieldName} 누락`);
  }

  const parsed = Number(String(value).replaceAll(",", ""));
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} 숫자 형식 오류`);
  }

  return parsed;
}

function findExactIndex(items, target) {
  return items.find(
    (item) => item?.idxCsf === target.idxCsf && item?.idxNm === target.idxNm
  );
}

function buildIndices(indexItems) {
  return INDEX_CARD_SPECS.map((spec) => {
    const item = findExactIndex(indexItems, spec);
    if (!item) throw new Error(`${spec.name} 지수 누락`);

    return {
      code: spec.code,
      name: spec.name,
      value: parseNumber(item.clpr, `${spec.name} 종가`),
      change: parseNumber(item.vs, `${spec.name} 대비`),
      changePercent: parseNumber(item.fltRt, `${spec.name} 등락률`),
    };
  });
}

function buildSectors(indexItems) {
  const sectors = SECTOR_SPECS.flatMap((spec) => {
    if (!spec.source) return [];
    const item = findExactIndex(indexItems, spec.source);
    if (!item) throw new Error(`${spec.name} 업종 지수 누락`);

    return [{
      name: spec.name,
      sourceIndexName: spec.source.idxNm,
      changePercent: parseNumber(item.fltRt, `${spec.name} 업종 등락률`),
    }];
  });

  if (sectors.length !== SECTOR_SPECS.filter((spec) => spec.source).length) {
    throw new Error("업종 지수 응답 불완전");
  }

  return sectors;
}

function normalizeStocks(stockItems) {
  const stocks = stockItems.flatMap((item) => {
    if (!TARGET_MARKETS.has(item?.mrktCtg) || !item?.itmsNm || !item?.srtnCd) return [];

    try {
      return [{
        code: String(item.srtnCd),
        market: item.mrktCtg,
        name: item.itmsNm,
        price: parseNumber(item.clpr, `${item.itmsNm} 종가`),
        changePercent: parseNumber(item.fltRt, `${item.itmsNm} 등락률`),
        turnover: parseNumber(item.trPrc, `${item.itmsNm} 거래대금`),
      }];
    } catch {
      return [];
    }
  });

  requireItems(stocks, "주식시세정보");
  return stocks;
}

function buildMarketBreadth(stocks) {
  return {
    totalStocks: stocks.length,
    stocksUpThreePercent: stocks.filter(
      (stock) => stock.changePercent >= STRONG_GAIN_THRESHOLD
    ).length,
  };
}

function rank(stocks, compare) {
  return [...stocks].sort(compare).slice(0, 5);
}

function buildRankings(stocks) {
  const rankings = {
    gainers: rank(stocks, (a, b) => b.changePercent - a.changePercent),
    losers: rank(stocks, (a, b) => a.changePercent - b.changePercent),
    turnover: rank(stocks, (a, b) => b.turnover - a.turnover),
  };

  if (Object.values(rankings).some((rows) => rows.length < 5)) {
    throw new Error("종목 순위 데이터 부족");
  }

  return rankings;
}

function buildAvailableRankings(stocks) {
  return {
    gainers: rank(stocks, (a, b) => b.changePercent - a.changePercent),
    losers: rank(stocks, (a, b) => a.changePercent - b.changePercent),
    turnover: rank(stocks, (a, b) => b.turnover - a.turnover),
  };
}

function formatDate(value) {
  return `${value.slice(0, 4)}.${value.slice(4, 6)}.${value.slice(6, 8)}`;
}

function formatIsoDate(value) {
  return value.replaceAll("-", ".");
}

function formatAsOf(indexBasDt, stockBasDt) {
  if (indexBasDt === stockBasDt) return formatDate(indexBasDt);
  return `지수 ${formatDate(indexBasDt)} · 종목 ${formatDate(stockBasDt)}`;
}

export function buildMarketSnapshot({ indexBasDt, stockBasDt, indexItems, stockItems }) {
  const stocks = normalizeStocks(stockItems);

  return {
    asOf: formatAsOf(indexBasDt, stockBasDt),
    isMock: false,
    source: "public-api",
    sourceDates: { indices: indexBasDt, stocks: stockBasDt },
    dataNotice: "공공데이터포털 금융위원회 일별 시세 · 영업일 다음 날 오후 갱신",
    indices: buildIndices(indexItems),
    stocks,
    marketBreadth: buildMarketBreadth(stocks),
    sectors: buildSectors(indexItems),
    rankings: buildRankings(stocks),
  };
}

function getFallbackSnapshot(reason = "") {
  const stocks = Array.from(
    new Map(
      Object.values(exampleMarketSnapshot.rankings)
        .flat()
        .map((stock) => [stock.code, stock])
    ).values()
  );

  return {
    ...exampleMarketSnapshot,
    stocks,
    source: "example",
    fallbackReason: reason,
    dataNotice: reason
      ? `${exampleMarketSnapshot.dataNotice} (${reason})`
      : exampleMarketSnapshot.dataNotice,
  };
}

function parseSupabaseNumber(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Supabase ${fieldName} 숫자 형식 오류`);
  return parsed;
}

export function buildSupabaseMarketSnapshot({ priceDate, rows }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Supabase 최신 기준일의 시세 데이터가 없습니다.");
  }

  const stocks = rows.map((row) => {
    if (row.price_date !== priceDate) throw new Error("Supabase 기준일이 섞여 있습니다.");
    if (!row.stock_code || !row.stock_name) throw new Error("Supabase 종목 정보가 누락됐습니다.");

    return {
      code: String(row.stock_code),
      market: "국내",
      name: String(row.stock_name),
      price: parseSupabaseNumber(row.closing_price, `${row.stock_name} 종가`),
      changePercent: parseSupabaseNumber(row.change_rate, `${row.stock_name} 등락률`),
      turnover: parseSupabaseNumber(row.trading_value, `${row.stock_name} 거래대금`),
    };
  });

  return {
    asOf: formatIsoDate(priceDate),
    isMock: false,
    source: "supabase",
    sourceDates: { stocks: priceDate },
    dataNotice: "Supabase에 저장된 최신 일별 시세",
    indices: [],
    stocks,
    marketBreadth: buildMarketBreadth(stocks),
    sectors: [],
    rankings: buildAvailableRankings(stocks),
  };
}

export async function getMarketSnapshot({
  fetchJson = fetchDataGoKrJson,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  try {
    const [indices, stocks] = await Promise.all([
      fetchLatestItems(
        fetchJson,
        INDEX_ENDPOINT,
        "지수시세정보",
        INDEX_ROWS_PER_DAY,
        timeoutMs
      ),
      fetchLatestItems(
        fetchJson,
        STOCK_ENDPOINT,
        "주식시세정보",
        STOCK_ROWS_PER_DAY,
        timeoutMs
      ),
    ]);

    return buildMarketSnapshot({
      indexBasDt: indices.basDt,
      stockBasDt: stocks.basDt,
      indexItems: indices.items,
      stockItems: stocks.items,
    });
  } catch (error) {
    return getFallbackSnapshot(error instanceof Error ? error.message : "알 수 없는 수집 오류");
  }
}

function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

export async function getDashboardSnapshot({
  fetchSupabase = fetchLatestDailyStockPrices,
  fetchJson = fetchDataGoKrJson,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  let supabaseFailureReason;

  try {
    const latestPrices = await fetchSupabase({ timeoutMs });
    return buildSupabaseMarketSnapshot(latestPrices);
  } catch (error) {
    supabaseFailureReason = errorMessage(error, "Supabase 알 수 없는 조회 오류");
  }

  const publicApiSnapshot = await getMarketSnapshot({ fetchJson, timeoutMs });
  if (!publicApiSnapshot.isMock) {
    return {
      ...publicApiSnapshot,
      dataNotice: `Supabase 조회 실패로 공공데이터를 표시합니다. (${supabaseFailureReason})`,
    };
  }

  const publicApiFailureReason = publicApiSnapshot.fallbackReason || "공공데이터 알 수 없는 조회 오류";
  return {
    ...publicApiSnapshot,
    dataNotice: [
      "Supabase와 공공데이터 조회에 실패해 예시 데이터를 표시합니다.",
      `${SUPABASE_URL_ENV}·${SUPABASE_PUBLISHABLE_KEY_ENV} 설정과 SELECT 정책을 확인하세요.`,
      `(Supabase: ${supabaseFailureReason} / 공공데이터: ${publicApiFailureReason})`,
    ].join(" "),
  };
}
