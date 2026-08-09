import { IndexCard } from "./IndexCard";
import { MarketHeat } from "./MarketHeat";
import { RankingTable } from "./RankingTable";
import { SectorHeatmap } from "./SectorHeatmap";

export function MarketDashboard({ snapshot }) {
  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="date-label">최근 공개된 국내 시장</p>
          <h1>시장 한눈에 보기</h1>
        </div>
        <div className="data-status">
          <span className={snapshot.isMock ? "mock-badge" : "source-badge"}>
            {snapshot.isMock ? "예시 데이터" : "공공데이터"}
          </span>
          <time>{snapshot.asOf} 기준</time>
        </div>
      </header>

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
        {snapshot.isMock
          ? "외부 데이터 수집에 실패해 예시 데이터를 표시하고 있습니다."
          : "금융위원회 공공데이터를 사용하며, 기준 거래일 다음 영업일 오후 1시 이후 갱신될 수 있습니다."}
      </footer>
    </main>
  );
}
