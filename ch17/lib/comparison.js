export const COMPARISON_STORAGE_KEY = "market-dashboard:comparison";

export function comparisonStocks(snapshot) {
  const stocks = snapshot.stocks || Object.values(snapshot.rankings || {}).flat().map(stock => ({
    ...stock, code: `mock:${stock.name}`,
  }));
  return [...new Map(stocks.filter(stock => stock && typeof stock.code === "string" && stock.name)
    .map(stock => [stock.code, stock])).values()];
}

export function initialComparison(stocks, saved) {
  const defaults = stocks.slice(0, 2).map(stock => stock.code);
  if (!Array.isArray(saved)) return [defaults[0] || "", defaults[1] || ""];
  const first = typeof saved[0] === "string" && saved[0] ? saved[0] : defaults[0] || "";
  const second = typeof saved[1] === "string" && saved[1] && saved[1] !== first
    ? saved[1] : stocks.find(stock => stock.code !== first)?.code || "";
  return [first, second];
}

export function selectComparison(current, position, code) {
  if (code && current[1 - position] === code) {
    return { selection: current, error: "같은 종목은 비교할 수 없습니다. 다른 종목을 골라 주세요." };
  }
  return { selection: current.map((value, index) => index === position ? code : value), error: "" };
}
