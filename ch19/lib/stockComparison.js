export const COMPARISON_STORAGE_KEY = "korea-market-dashboard-comparison";
export const SAME_STOCK_MESSAGE = "같은 종목은 비교할 수 없습니다. 다른 종목을 골라 주세요.";

export function parseSavedComparisonCodes(serialized) {
  if (typeof serialized !== "string") return [];

  try {
    const parsed = JSON.parse(serialized);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((code) => typeof code === "string");
  } catch {
    return [];
  }
}

export function normalizeComparisonCodes(stocks, candidateCodes = []) {
  const availableCodes = [...new Set(stocks.map((stock) => stock.code))];
  const availableCodeSet = new Set(availableCodes);
  const selectedCodes = [];

  for (const code of candidateCodes) {
    if (availableCodeSet.has(code) && !selectedCodes.includes(code)) {
      selectedCodes.push(code);
    }
    if (selectedCodes.length === 2) return selectedCodes;
  }

  for (const code of availableCodes) {
    if (!selectedCodes.includes(code)) selectedCodes.push(code);
    if (selectedCodes.length === 2) break;
  }

  return selectedCodes;
}

export function selectComparisonStock(selectedCodes, slotIndex, nextCode) {
  const otherSlotIndex = slotIndex === 0 ? 1 : 0;
  if (selectedCodes[otherSlotIndex] === nextCode) {
    return { selectedCodes, error: SAME_STOCK_MESSAGE };
  }

  const nextSelectedCodes = [...selectedCodes];
  nextSelectedCodes[slotIndex] = nextCode;
  return { selectedCodes: nextSelectedCodes, error: "" };
}
