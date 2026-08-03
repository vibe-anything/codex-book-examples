import { IndexCard } from "./IndexCard";
import { MarketHeat } from "./MarketHeat";
import { RankingTable } from "./RankingTable";
import { SectorHeatmap } from "./SectorHeatmap";
import { Watchlist } from "./Watchlist";

export function MarketDashboard({ snapshot }) {
  const sourceLabel = {
    supabase: "Supabase",
    "supabase+public-api": "Supabase + 공공데이터",
    "supabase+example": "Supabase + 예시 데이터",
    "public-api": "공공데이터",
    example: "예시 데이터",
  }[snapshot.source] ?? (snapshot.isMock ? "예시 데이터" : "공공데이터");

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="date-label">최근 공개된 국내 시장</p>
          <h1>시장 한눈에 보기</h1>
        </div>
        <div className="data-status">
          <span
            className={
              snapshot.isMock || snapshot.hasExampleData
                ? "mock-badge"
                : "source-badge"
            }
          >
            {sourceLabel}
          </span>
          <div className="data-status-copy">
            <time>{snapshot.asOf} 기준</time>
            <p>{snapshot.dataNotice}</p>
          </div>
        </div>
      </header>

      <Watchlist stocks={snapshot.stocks} />

      <section className="market-summary" aria-label="시장 지수와 시장 열기">
        {snapshot.indices.map((index) => <IndexCard index={index} key={index.code} />)}
        <MarketHeat breadth={snapshot.marketBreadth} />
      </section>

      <SectorHeatmap sectors={snapshot.sectors} />

      <section className="rankings" aria-labelledby="ranking-title">
        <div className="section-heading ranking-heading">
          <h2 id="ranking-title">최근 거래일 주요 종목</h2>
        </div>
        <div className="ranking-grid">
          <RankingTable title="상승률 상위" badge="up" rows={snapshot.rankings.gainers} />
          <RankingTable title="하락률 상위" badge="down" rows={snapshot.rankings.losers} />
          <RankingTable title="거래대금 상위" badge="turnover" rows={snapshot.rankings.turnover} showTurnover />
        </div>
      </section>

      <footer>
        {snapshot.source === "supabase+public-api"
          ? "종목은 Supabase 최신 종가, 시장 지표는 금융위원회 공공데이터 기준이며 실시간 투자 정보가 아닙니다."
          : snapshot.source === "supabase+example"
            ? "종목은 Supabase 실제 시세이며, 시장 지표는 공공데이터 조회 실패에 대비한 예시입니다."
          : snapshot.isMock
            ? "현재 수치는 조회 실패에 대비한 예시이며 실제 투자 정보가 아닙니다."
            : "금융위원회 공공데이터를 사용하며, 기준 거래일 다음 영업일 오후 1시 이후 갱신될 수 있습니다."}
      </footer>
    </main>
  );
}
