export const COMPARISON_STORAGE_KEY = "market-dashboard:comparison-codes";
export const DUPLICATE_SELECTION_MESSAGE = "서로 다른 종목을 선택해 주세요.";

function availableCodes(stocks) {
  const codes = [];
  const seen = new Set();

  for (const stock of stocks ?? []) {
    if (typeof stock?.code !== "string" || seen.has(stock.code)) continue;
    seen.add(stock.code);
    codes.push(stock.code);
  }

  return codes;
}

export function normalizeComparisonCodes(stocks, storedCodes) {
  const codes = availableCodes(stocks);
  const available = new Set(codes);
  const normalized = [];
  const requestedCodes = Array.isArray(storedCodes) ? storedCodes : [];

  for (const code of [...requestedCodes, ...codes]) {
    if (
      typeof code === "string" &&
      available.has(code) &&
      !normalized.includes(code)
    ) {
      normalized.push(code);
    }

    if (normalized.length === 2) break;
  }

  return normalized;
}

export function parseStoredComparison(rawValue, stocks) {
  if (typeof rawValue !== "string") {
    return normalizeComparisonCodes(stocks, []);
  }

  try {
    return normalizeComparisonCodes(stocks, JSON.parse(rawValue));
  } catch {
    return normalizeComparisonCodes(stocks, []);
  }
}

export function updateComparisonSelection(stocks, currentCodes, position, nextCode) {
  const normalized = normalizeComparisonCodes(stocks, currentCodes);
  const selectableCodes = new Set(availableCodes(stocks));

  if ((position !== 0 && position !== 1) || !selectableCodes.has(nextCode)) {
    return {
      codes: normalized,
      error: "선택할 수 없는 종목입니다.",
    };
  }

  const otherPosition = position === 0 ? 1 : 0;

  if (normalized[otherPosition] === nextCode) {
    return {
      codes: normalized,
      error: DUPLICATE_SELECTION_MESSAGE,
    };
  }

  const nextCodes = [...normalized];
  nextCodes[position] = nextCode;

  return { codes: nextCodes, error: "" };
}

export function movementKind(value) {
  const rate = Number(value);

  if (Number.isFinite(rate) && rate > 0) return "positive";
  if (Number.isFinite(rate) && rate < 0) return "negative";
  return "neutral";
}

export function movementLabel(value) {
  const kind = movementKind(value);

  if (kind === "positive") return "상승";
  if (kind === "negative") return "하락";
  return "보합";
}

export function formatChangeRate(value) {
  const parsed = Number(value);
  const rate = Number.isFinite(parsed) ? parsed : 0;
  const sign = rate > 0 ? "+" : "";

  return `${sign}${rate.toFixed(2)}%`;
}
