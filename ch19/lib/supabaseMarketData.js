export const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
export const SUPABASE_PUBLISHABLE_KEY_ENV =
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";
export const DAILY_QUOTES_TABLE = "daily_quotes";

const PAGE_SIZE = 1_000;
const DEFAULT_TIMEOUT_MS = 8_000;

function requireEnvironmentValue(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} 환경 변수가 없습니다.`);
  }

  return value;
}

function getSupabaseRestUrl(baseUrl, searchParams) {
  let url;

  try {
    url = new URL(`/rest/v1/${DAILY_QUOTES_TABLE}`, baseUrl);
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
      timeoutMs,
    );
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function readRows(
  fetchImpl,
  url,
  publishableKey,
  timeoutMs,
  headers = {},
) {
  const response = await withTimeout(
    Promise.resolve().then(() =>
      fetchImpl(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          apikey: publishableKey,
          ...headers,
        },
        next: { revalidate: 60 * 60 },
        signal: AbortSignal.timeout(timeoutMs),
      }),
    ),
    timeoutMs,
  );

  if (!response.ok) {
    throw new Error(`Supabase 조회 실패: HTTP ${response.status}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows)) {
    throw new Error("Supabase 응답 형식이 올바르지 않습니다.");
  }

  return {
    rows,
    contentRange: response.headers?.get?.("content-range") ?? "",
  };
}

function readTotalCount(contentRange) {
  const match = contentRange.match(/\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function assertTradeDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Supabase 최신 기준일이 올바르지 않습니다.");
  }
}

export async function fetchLatestDailyQuotes({
  fetchImpl = fetch,
  supabaseUrl = requireEnvironmentValue(SUPABASE_URL_ENV),
  publishableKey = requireEnvironmentValue(SUPABASE_PUBLISHABLE_KEY_ENV),
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const latestDateUrl = getSupabaseRestUrl(supabaseUrl, {
    select: "trade_date",
    order: "trade_date.desc",
    limit: 1,
  });
  const latestDateResult = await readRows(
    fetchImpl,
    latestDateUrl,
    publishableKey,
    timeoutMs,
  );
  const tradeDate = latestDateResult.rows[0]?.trade_date;

  if (!tradeDate) {
    throw new Error("Supabase에 일별 시세 데이터가 없습니다.");
  }
  assertTradeDate(tradeDate);

  const rows = [];
  let offset = 0;
  let totalCount = null;

  while (totalCount === null || rows.length < totalCount) {
    const pageUrl = getSupabaseRestUrl(supabaseUrl, {
      select:
        "trade_date,stock_code,stock_name,close_price,change_rate,trading_value",
      trade_date: `eq.${tradeDate}`,
      order: "stock_code.asc",
      limit: PAGE_SIZE,
      offset,
    });
    const page = await readRows(
      fetchImpl,
      pageUrl,
      publishableKey,
      timeoutMs,
      { Prefer: "count=exact" },
    );

    if (totalCount === null) {
      totalCount = readTotalCount(page.contentRange);
    }
    rows.push(...page.rows);

    if (page.rows.length === 0) break;
    if (totalCount === null && page.rows.length < PAGE_SIZE) break;
    offset += page.rows.length;
  }

  if (rows.length === 0) {
    throw new Error("Supabase 최신 기준일의 시세 데이터가 없습니다.");
  }

  return { tradeDate, rows };
}
