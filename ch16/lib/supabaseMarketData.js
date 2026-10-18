// 서버 페이지에서 사용하는 읽기 전용 PostgREST 조회. 쓰기 요청은 제공하지 않는다.
export async function readLatestDailyPrices({
  fetchImpl = fetch,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
  publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
} = {}) {
  if (!supabaseUrl?.trim() || !publishableKey?.trim()) throw new Error('Supabase 설정 누락');
  async function read(params, count = false) {
    const url = new URL('/rest/v1/daily_prices', supabaseUrl.trim());
    url.search = new URLSearchParams(params);
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { apikey: publishableKey.trim(), Accept: 'application/json', ...(count ? { Prefer: 'count=exact' } : {}) },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('Supabase 조회 실패');
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('Supabase 응답 오류');
    return { rows, range: response.headers.get('content-range') };
  }
  const latest = await read({ select: 'trade_date', order: 'trade_date.desc', limit: '1' });
  const date = latest.rows[0]?.trade_date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('최신 기준일 누락');
  const rows = [];
  let total;
  for (let page = 0; page < 100; page++) {
    const result = await read({
      select: 'trade_date,stock_code,stock_name,close_price,change_percent,trading_value',
      trade_date: `eq.${date}`, order: 'stock_code.asc', limit: '1000', offset: String(rows.length),
    }, true);
    const match = result.range?.match(/\/(\d+)$/);
    if (!match) throw new Error('전체 시세 건수 누락');
    const count = Number(match[1]);
    if (total !== undefined && total !== count) throw new Error('조회 중 시세 건수 변경');
    total = count;
    rows.push(...result.rows);
    if (!result.rows.length || rows.length >= total) break;
  }
  if (!rows.length || rows.length !== total) throw new Error('시세 목록 불완전');
  if (rows.some(row => row.trade_date !== date)) throw new Error('시세 기준일 불일치');
  return { date, rows };
}
