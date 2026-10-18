import { IndexCard } from "./IndexCard";
import { MarketHeat } from "./MarketHeat";
import { RankingTable } from "./RankingTable";
import { SectorHeatmap } from "./SectorHeatmap";

export function MarketDashboard({ snapshot }) {
  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="date-label">오늘의 국내 시장</p>
          <h1>시장 한눈에 보기</h1>
        </div>
        <div className="data-status">
          {snapshot.isMock && <span className="mock-badge">예시 데이터</span>}
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
          <h2 id="ranking-title">오늘의 주요 종목</h2>
        </div>
        <div className="ranking-grid">
          <RankingTable title="상승률 상위" badge="up" rows={snapshot.rankings.gainers} />
          <RankingTable title="하락률 상위" badge="down" rows={snapshot.rankings.losers} />
          <RankingTable title="거래대금 상위" badge="turnover" rows={snapshot.rankings.turnover} showTurnover />
        </div>
      </section>

      <footer>{snapshot.isMock
        ? "본 화면의 수치는 기능 확인을 위한 예시이며 실제 투자 정보가 아닙니다."
        : "출처: 공공데이터포털 · 금융위원회 / 한국거래소. 일별 종가 기준이며 실시간 시세가 아닙니다. 지수 그래프는 최근 일별 종가입니다."}</footer>
    </main>
  );
}
