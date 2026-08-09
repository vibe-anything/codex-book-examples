import { formatSigned, sectorToneClass } from "@/lib/market";

function ChangeLegend() {
  return (
    <div className="legend" aria-label="색상 범례">
      <span><i className="legend-chip down" />하락</span>
      <span><i className="legend-chip flat" />보합</span>
      <span><i className="legend-chip up" />상승</span>
    </div>
  );
}

export function SectorHeatmap({ sectors, themes }) {
  const availableSectors = sectors.filter(
    (sector) => sector.available !== false && Number.isFinite(sector.changePercent),
  );
  const availableThemes = themes.filter(
    (theme) => theme.available !== false && Number.isFinite(theme.changePercent),
  );

  return (
    <>
      <section aria-labelledby="sector-title">
        <div className="section-heading">
          <h2 id="sector-title">산업분류 히트맵</h2>
          <ChangeLegend />
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

      <section aria-labelledby="theme-title">
        <div className="section-heading theme-heading">
          <div>
            <h2 id="theme-title">테마 지수</h2>
            <p>일반 산업분류와 구분한 공식 TOP 10 지수입니다.</p>
          </div>
          <ChangeLegend />
        </div>
        <div className="sector-grid theme-grid">
          {availableThemes.map((theme) => (
            <article
              className={`sector-tile theme-tile ${sectorToneClass(theme.changePercent)}`}
              key={theme.sourceIndexName}
            >
              <header>
                <h3>{theme.sourceIndexName}</h3>
                <span>{theme.sourceIndexCategory}</span>
              </header>
              <p>{formatSigned(theme.changePercent, 2)}%</p>
            </article>
          ))}
        </div>
        <p className="theme-exclusion-note">
          화장품은 정확히 대응하는 공식 지수를 확인하지 못해 표시하지 않습니다.
        </p>
      </section>
    </>
  );
}
