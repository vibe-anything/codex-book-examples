import { calculateMarketHeat } from "@/lib/market";

export function MarketHeat({ breadth }) {
  const heat = calculateMarketHeat(breadth);

  return (
    <article className="heat-card panel" aria-labelledby="market-heat-title">
      <p className="eyebrow" id="market-heat-title">시장 열기</p>
      <div className="heat-value">
        <strong>{heat.toFixed(1)}</strong>
        <span>%</span>
      </div>
    </article>
  );
}
