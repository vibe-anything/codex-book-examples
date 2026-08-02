import { IndexCard } from "./IndexCard";
import { MarketHeat } from "./MarketHeat";
import { RankingTable } from "./RankingTable";
import { SectorHeatmap } from "./SectorHeatmap";
import { Watchlist } from "./Watchlist";

export function MarketDashboard({ snapshot }) {
  const stocks = snapshot.stocks ?? Array.from(
    new Map(
      Object.values(snapshot.rankings)
        .flat()
        .map((stock) => [stock.code, stock])
    ).values()
  );
  const sourceLabel = {
    supabase: "Supabase",
    "public-api": "공공데이터",
    example: "예시 데이터",
  }[snapshot.source] ?? (snapshot.isMock ? "예시 데이터" : "공공데이터");
  const hasIndices = snapshot.indices.length > 0;
  const hasSectors = snapshot.sectors.length > 0;

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="date-label">오늘의 국내 시장</p>
          <h1>시장 한눈에 보기</h1>
        </div>
        <div className="data-status">
          <span className={`source-badge ${snapshot.isMock ? "mock" : "live"}`}>
            {sourceLabel}
          </span>
          <div className="data-status-copy">
            <time>{snapshot.asOf} 기준</time>
            <p>{snapshot.dataNotice}</p>
          </div>
        </div>
      </header>

      <Watchlist stocks={stocks} />

      <section
        className={`market-summary ${hasIndices ? "" : "stocks-only"}`}
        aria-label="시장 지수와 시장 열기"
      >
        {snapshot.indices.map((index) => <IndexCard index={index} key={index.code} />)}
        <MarketHeat breadth={snapshot.marketBreadth} />
      </section>

      {hasSectors && <SectorHeatmap sectors={snapshot.sectors} />}

      <section className="rankings" aria-labelledby="ranking-title">
        <div className="section-heading ranking-heading">
          <h2 id="ranking-title">주요 종목 순위</h2>
        </div>
        <div className="ranking-grid">
          <RankingTable title="상승률 상위" badge="up" rows={snapshot.rankings.gainers} />
          <RankingTable title="하락률 상위" badge="down" rows={snapshot.rankings.losers} />
          <RankingTable title="거래대금 상위" badge="turnover" rows={snapshot.rankings.turnover} showTurnover />
        </div>
      </section>

      <footer>
        {snapshot.source === "supabase"
          ? "Supabase의 최신 기준일 종가이며 실시간 투자 정보가 아닙니다."
          : snapshot.isMock
            ? "현재 수치는 수집 실패에 대비한 예시이며 실제 투자 정보가 아닙니다."
            : "금융위원회 일별 시세 기준이며 실시간 투자 정보가 아닙니다."}
      </footer>
    </main>
  );
}
