import { supabaseRest, supabaseRestPages } from "./supabaseServer.js";

function compactDate(value) {
  return String(value ?? "").replaceAll("-", "");
}

function toStockItem(row) {
  return {
    basDt: compactDate(row.trade_date),
    srtnCd: row.stock_code,
    itmsNm: row.stock_name,
    mrktCtg: row.market,
    clpr: row.close_price,
    fltRt: row.change_rate,
    trPrc: row.turnover,
  };
}

export async function fetchLatestDailyStockPriceItems() {
  const latestRows = await supabaseRest("daily_stock_prices", {
    searchParams: {
      select: "trade_date",
      order: "trade_date.desc",
      limit: 1,
    },
  });

  const tradeDate = latestRows?.[0]?.trade_date;
  if (!tradeDate) return null;

  const rows = await supabaseRestPages("daily_stock_prices", {
    searchParams: {
      select: "trade_date,stock_code,stock_name,market,close_price,change_rate,turnover",
      trade_date: `eq.${tradeDate}`,
      order: "stock_code.asc",
    },
  });

  if (rows.length === 0) return null;

  return {
    basDt: compactDate(tradeDate),
    items: rows.map(toStockItem),
  };
}
