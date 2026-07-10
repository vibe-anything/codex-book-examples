import { supabaseRest } from "./supabaseServer.js";

const STOCK_CODE_PATTERN = /^[0-9A-Z]{6}$/;

export function normalizeStockCode(value) {
  return String(value ?? "").trim().replace(/^A/i, "").toUpperCase();
}

export function assertStockCode(value) {
  const stockCode = normalizeStockCode(value);

  if (!STOCK_CODE_PATTERN.test(stockCode)) {
    throw new Error("Invalid stock code.");
  }

  return stockCode;
}

export async function getWatchlistCodes() {
  const rows = await supabaseRest("watchlist_stocks", {
    searchParams: {
      select: "stock_code",
      order: "sort_order.asc,created_at.asc",
    },
  });

  return Array.isArray(rows) ? rows.map((row) => row.stock_code) : [];
}

async function getNextSortOrder() {
  const rows = await supabaseRest("watchlist_stocks", {
    searchParams: {
      select: "sort_order",
      order: "sort_order.desc",
      limit: 1,
    },
  });

  return (rows?.[0]?.sort_order ?? -1) + 1;
}

export async function addWatchlistCode(value) {
  const stockCode = assertStockCode(value);
  const sortOrder = await getNextSortOrder();

  await supabaseRest("watchlist_stocks", {
    method: "POST",
    searchParams: {
      on_conflict: "stock_code",
    },
    headers: {
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: [
      {
        stock_code: stockCode,
        sort_order: sortOrder,
      },
    ],
  });

  return getWatchlistCodes();
}

export async function removeWatchlistCode(value) {
  const stockCode = assertStockCode(value);

  await supabaseRest("watchlist_stocks", {
    method: "DELETE",
    searchParams: {
      stock_code: `eq.${stockCode}`,
    },
    headers: {
      Prefer: "return=minimal",
    },
  });

  return getWatchlistCodes();
}
