import { changeTone, formatSigned } from "./market.js";

export const COMPARISON_STORAGE_KEY = "market-dashboard-comparison";

const CHANGE_LABELS = {
  up: "상승",
  down: "하락",
  flat: "보합",
};

function availableCodes(stocks) {
  return new Set(
    stocks
      .map((stock) => stock?.code)
      .filter((code) => code !== undefined && code !== null && code !== "")
      .map(String),
  );
}

export function getDefaultComparisonCodes(stocks = []) {
  return [...availableCodes(stocks)].slice(0, 2);
}

export function restoreComparisonCodes(stocks = [], storedCodes) {
  const defaults = getDefaultComparisonCodes(stocks);
  if (defaults.length < 2) return defaults;
  if (!Array.isArray(storedCodes) || storedCodes.length !== 2) return defaults;

  const validCodes = availableCodes(stocks);
  const candidates = storedCodes.map(String);

  if (candidates[0] === candidates[1]) return defaults;
  if (!candidates.every((code) => validCodes.has(code))) return defaults;

  return candidates;
}

export function updateComparisonCodes(stocks, currentCodes, slot, nextCode) {
  const safeCurrentCodes = restoreComparisonCodes(stocks, currentCodes);
  const validCodes = availableCodes(stocks);
  const normalizedNextCode = String(nextCode);

  if ((slot !== 0 && slot !== 1) || !validCodes.has(normalizedNextCode)) {
    return {
      codes: safeCurrentCodes,
      error: "선택할 수 있는 종목을 골라 주세요.",
    };
  }

  const otherSlot = slot === 0 ? 1 : 0;
  if (safeCurrentCodes[otherSlot] === normalizedNextCode) {
    return {
      codes: safeCurrentCodes,
      error: "서로 다른 두 종목을 골라 주세요.",
    };
  }

  const nextCodes = [...safeCurrentCodes];
  nextCodes[slot] = normalizedNextCode;

  return { codes: nextCodes, error: "" };
}

export function describeStockChange(value, fractionDigits = 2) {
  const tone = changeTone(value);
  const signedPercent = `${formatSigned(value, fractionDigits)}%`;

  return {
    tone,
    label: CHANGE_LABELS[tone],
    signedPercent,
    accessibleText: `${CHANGE_LABELS[tone]} ${signedPercent}`,
  };
}
