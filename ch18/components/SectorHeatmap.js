import { formatSigned, sectorToneClass } from "@/lib/market";

export function SectorHeatmap({ sectors }) {
  const availableSectors = sectors.filter(
    (sector) => sector.available !== false && Number.isFinite(sector.changePercent),
  );

  return (
    <section aria-labelledby="sector-title">
      <div className="section-heading">
        <h2 id="sector-title">업종 히트맵</h2>
        <div className="legend" aria-label="색상 범례">
          <span><i className="legend-chip down" />하락</span>
          <span><i className="legend-chip flat" />보합</span>
          <span><i className="legend-chip up" />상승</span>
        </div>
      </div>
      <div className="sector-grid">
        {availableSectors.map((sector) => (
          <article
            className={`sector-tile ${sectorToneClass(sector.changePercent)}`}
            key={sector.name}
          >
            <h3>{sector.name}</h3>
            <p>{formatSigned(sector.changePercent, 2)}%</p>
          </article>
        ))}
      </div>
    </section>
  );
}
