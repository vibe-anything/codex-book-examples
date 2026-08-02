export const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
export const SUPABASE_PUBLISHABLE_KEY_ENV = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";
export const DAILY_STOCK_PRICES_TABLE = "daily_stock_prices";

const PAGE_SIZE = 1000;
const DEFAULT_TIMEOUT_MS = 8000;

function requireEnvironmentValue(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} 환경 변수가 없습니다.`);
  return value;
}

function getSupabaseRestUrl(baseUrl, searchParams) {
  let url;

  try {
    url = new URL(`/rest/v1/${DAILY_STOCK_PRICES_TABLE}`, baseUrl);
  } catch {
    throw new Error(`${SUPABASE_URL_ENV} 형식이 올바르지 않습니다.`);
  }

  Object.entries(searchParams).forEach(([name, value]) => {
    url.searchParams.set(name, String(value));
  });

  return url;
}

async function withTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("Supabase 응답 시간 초과")),
      timeoutMs
    );
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function readRows(fetchImpl, url, publishableKey, timeoutMs, headers = {}) {
  const response = await withTimeout(
    Promise.resolve().then(() => fetchImpl(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        apikey: publishableKey,
        ...headers,
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(timeoutMs),
    })),
    timeoutMs
  );

  if (!response.ok) {
    throw new Error(`Supabase 조회 실패: HTTP ${response.status}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("Supabase 응답 형식이 올바르지 않습니다.");

  return { rows, contentRange: response.headers?.get?.("content-range") ?? "" };
}

function readTotalCount(contentRange) {
  const match = contentRange.match(/\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function assertPriceDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Supabase 최신 기준일이 올바르지 않습니다.");
  }
}

export async function fetchLatestDailyStockPrices({
  fetchImpl = fetch,
  supabaseUrl = requireEnvironmentValue(SUPABASE_URL_ENV),
  publishableKey = requireEnvironmentValue(SUPABASE_PUBLISHABLE_KEY_ENV),
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const latestDateUrl = getSupabaseRestUrl(supabaseUrl, {
    select: "price_date",
    order: "price_date.desc",
    limit: 1,
  });
  const latestDateResult = await readRows(
    fetchImpl,
    latestDateUrl,
    publishableKey,
    timeoutMs
  );
  const priceDate = latestDateResult.rows[0]?.price_date;

  if (!priceDate) throw new Error("Supabase에 일별 시세 데이터가 없습니다.");
  assertPriceDate(priceDate);

  const rows = [];
  let offset = 0;
  let totalCount = null;

  while (totalCount === null || rows.length < totalCount) {
    const pageUrl = getSupabaseRestUrl(supabaseUrl, {
      select: "stock_code,stock_name,price_date,closing_price,change_rate,trading_value",
      price_date: `eq.${priceDate}`,
      order: "stock_code.asc",
      limit: PAGE_SIZE,
      offset,
    });
    const page = await readRows(
      fetchImpl,
      pageUrl,
      publishableKey,
      timeoutMs,
      { Prefer: "count=exact" }
    );

    if (totalCount === null) totalCount = readTotalCount(page.contentRange);
    rows.push(...page.rows);

    if (page.rows.length === 0) break;
    if (totalCount === null && page.rows.length < PAGE_SIZE) break;
    offset += page.rows.length;
  }

  if (rows.length === 0) throw new Error("Supabase 최신 기준일의 시세 데이터가 없습니다.");

  return { priceDate, rows };
}
