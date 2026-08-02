import { formatSigned } from "./market.js";

export const STOCK_COMPARE_STORAGE_KEY = "korea-market-dashboard-stock-comparison";

export function getComparableStocks(snapshot) {
  const candidates = Array.isArray(snapshot?.stocks)
    ? snapshot.stocks
    : Object.values(snapshot?.rankings ?? {}).flat();

  return Array.from(
    new Map(
      candidates
        .filter((stock) => stock && typeof stock.code === "string")
        .map((stock) => [stock.code, stock])
    ).values()
  );
}

export function normalizeComparisonCodes(codes, stocks) {
  const availableCodes = new Set(stocks.map((stock) => stock.code));
  const normalized = [];

  if (Array.isArray(codes)) {
    codes.forEach((code) => {
      if (
        normalized.length < 2
        && typeof code === "string"
        && availableCodes.has(code)
        && !normalized.includes(code)
      ) {
        normalized.push(code);
      }
    });
  }

  stocks.forEach((stock) => {
    if (normalized.length < 2 && !normalized.includes(stock.code)) {
      normalized.push(stock.code);
    }
  });

  return normalized;
}

export function selectComparisonCode(currentCodes, side, nextCode, stocks) {
  const codes = normalizeComparisonCodes(currentCodes, stocks);
  const selectedIndex = side === "right" ? 1 : 0;
  const otherIndex = selectedIndex === 0 ? 1 : 0;

  if (!stocks.some((stock) => stock.code === nextCode)) {
    return { codes, error: "선택할 수 없는 종목입니다." };
  }

  if (nextCode === codes[otherIndex]) {
    return { codes, error: "같은 종목은 비교할 수 없습니다. 다른 종목을 골라 주세요." };
  }

  const nextCodes = [...codes];
  nextCodes[selectedIndex] = nextCode;
  return { codes: nextCodes, error: "" };
}

export function formatComparisonRate(value, fractionDigits = 2) {
  if (value === 0) return `±${Math.abs(value).toFixed(fractionDigits)}%`;
  return `${formatSigned(value, fractionDigits)}%`;
}
