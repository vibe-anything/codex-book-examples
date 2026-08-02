export function calculateMarketHeat({ totalStocks, stocksUpThreePercent }) {
  if (!Number.isFinite(totalStocks) || totalStocks <= 0) return 0;
  if (!Number.isFinite(stocksUpThreePercent)) return 0;

  const ratio = (stocksUpThreePercent / totalStocks) * 100;
  return Math.min(100, Math.max(0, ratio));
}

export function formatNumber(value, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits }).format(value);
}

export function formatSigned(value, fractionDigits = 2) {
  const formatted = Math.abs(value).toFixed(fractionDigits);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}

export function formatPrice(value) {
  return `${formatNumber(value)}원`;
}

export function formatTurnover(valueInWon) {
  if (!Number.isFinite(valueInWon) || valueInWon < 0) return "-";

  if (valueInWon >= 1_000_000_000_000) {
    const trillion = valueInWon / 1_000_000_000_000;
    return `${Number.isInteger(trillion) ? trillion : trillion.toFixed(1)}조원`;
  }

  if (valueInWon >= 100_000_000) {
    return `${formatNumber(Math.round(valueInWon / 100_000_000))}억원`;
  }

  return `${formatNumber(valueInWon)}원`;
}

export function changeTone(value) {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

export function sectorToneClass(changePercent) {
  const tone = changeTone(changePercent);
  if (tone === "flat") return "sector-flat";
  const intensity = Math.min(4, Math.max(1, Math.ceil(Math.abs(changePercent))));
  return `sector-${tone}-${intensity}`;
}
