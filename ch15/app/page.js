import styles from "./page.module.css";
import { marketData } from "../lib/mockMarketData";

function formatRate(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function toneClass(value) {
  if (value > 0) return styles.positive;
  if (value < 0) return styles.negative;
  return styles.neutral;
}

function heatClass(value) {
  if (value >= 1.2) return styles.heatPositiveStrong;
  if (value > 0) return styles.heatPositive;
  if (value <= -1.2) return styles.heatNegativeStrong;
  if (value < 0) return styles.heatNegative;
  return styles.heatNeutral;
}

function IndexCard({ index }) {
  const totalStocks = index.advancers + index.decliners + index.unchanged;
  const advancerRatio = Math.round((index.advancers / totalStocks) * 100);

  return (
    <section className={styles.indexCard}>
      <div className={styles.cardHeader}>
        <h2>{index.name}</h2>
        <span className={`${styles.badge} ${toneClass(index.changeRate)}`}>
          {formatRate(index.changeRate)}
        </span>
      </div>
      <div className={styles.indexValue}>{index.value}</div>
      <div className={`${styles.indexChange} ${toneClass(index.changeRate)}`}>
        {index.change}
      </div>
      <div className={styles.indexMeta}>
        <span>거래대금 {index.turnover}</span>
        <span>상승 {advancerRatio}%</span>
      </div>
      <div className={styles.breadthBar} aria-label={`${index.name} 상승 종목 비율`}>
        <span style={{ width: `${advancerRatio}%` }} />
      </div>
      <div className={styles.breadthCounts}>
        <span>상승 {index.advancers}</span>
        <span>하락 {index.decliners}</span>
        <span>보합 {index.unchanged}</span>
      </div>
    </section>
  );
}

function MarketPulse({ summary }) {
  const total = summary.totalAdvancers + summary.totalDecliners + summary.totalUnchanged;
  const advancerRatio = Math.round((summary.totalAdvancers / total) * 100);
  const declinerRatio = Math.round((summary.totalDecliners / total) * 100);

  return (
    <section className={styles.pulsePanel}>
      <div className={styles.sectionTitle}>
        <h2>시장 열기</h2>
        <span>{summary.heatLabel}</span>
      </div>
      <div className={styles.heatGauge}>
        <div>
          <strong>{summary.heatScore}</strong>
          <span>/ 100</span>
        </div>
        <p>{summary.tone}</p>
      </div>
      <div className={styles.summaryGrid}>
        <div>
          <span>상승 비율</span>
          <strong>{advancerRatio}%</strong>
        </div>
        <div>
          <span>하락 비율</span>
          <strong>{declinerRatio}%</strong>
        </div>
        <div>
          <span>전체 거래대금</span>
          <strong>{summary.totalTurnover}</strong>
        </div>
      </div>
    </section>
  );
}

function SectorHeatmap({ sectors }) {
  return (
    <section className={styles.heatmapPanel}>
      <div className={styles.sectionTitle}>
        <h2>업종 히트맵</h2>
        <span>등락률 기준</span>
      </div>
      <div className={styles.heatmap}>
        {sectors.map((sector) => (
          <article className={`${styles.sectorTile} ${heatClass(sector.changeRate)}`} key={sector.name}>
            <strong>{sector.name}</strong>
            <span>{formatRate(sector.changeRate)}</span>
            <small>거래 {sector.turnoverStrength}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function StockTable({ title, description, stocks }) {
  return (
    <section className={styles.stockPanel}>
      <div className={styles.sectionTitle}>
        <h2>{title}</h2>
        <span>{description}</span>
      </div>
      <div className={styles.table}>
        {stocks.map((stock) => (
          <div className={styles.stockRow} key={`${title}-${stock.rank}`}>
            <span className={styles.rank}>{stock.rank}</span>
            <div className={styles.stockName}>
              <strong>{stock.name}</strong>
              <span>{stock.market}</span>
            </div>
            <span className={styles.price}>{stock.price}</span>
            <span className={`${styles.rate} ${toneClass(stock.changeRate)}`}>
              {formatRate(stock.changeRate)}
            </span>
            <span className={styles.turnover}>{stock.turnover}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { indices, marketSummary, sectors, topStocks } = marketData;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Korea Market Snapshot</p>
          <h1>국내 시장 대시보드</h1>
          <p className={styles.lead}>지수, 업종 흐름, 주요 종목을 한 화면에서 확인합니다.</p>
        </div>
        <aside className={styles.notice}>
          <strong>기준 {marketData.asOf}</strong>
          <span>{marketData.dataNotice}</span>
          <small>투자 판단이나 추천을 제공하지 않습니다.</small>
        </aside>
      </header>

      <div className={styles.indexGrid}>
        {indices.map((index) => (
          <IndexCard index={index} key={index.name} />
        ))}
      </div>

      <div className={styles.marketGrid}>
        <MarketPulse summary={marketSummary} />
        <SectorHeatmap sectors={sectors} />
      </div>

      <div className={styles.stockGrid}>
        <StockTable title="상승률 상위" description="등락률 기준" stocks={topStocks.gainers} />
        <StockTable title="하락률 상위" description="등락률 기준" stocks={topStocks.losers} />
        <StockTable title="거래대금 상위" description="거래대금 기준" stocks={topStocks.turnover} />
      </div>
    </main>
  );
}
