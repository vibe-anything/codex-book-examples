import { getMarketData } from "../../lib/marketData.js";
import StockComparison from "../StockComparison.js";
import styles from "../stockComparison.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "종목 비교 | 국내 시장 대시보드",
  description: "서로 다른 두 종목의 현재가와 오늘 등락률을 비교합니다.",
};

export default async function ComparePage() {
  const marketData = await getMarketData();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Stock Comparison</p>
          <h1>종목 비교</h1>
          <p className={styles.lead}>두 종목의 현재가와 오늘 등락률을 나란히 확인합니다.</p>
        </div>
        <a className={styles.homeLink} href="/">
          ← 홈으로 돌아가기
        </a>
      </header>

      <p className={styles.dataNotice}>
        <strong>{marketData.asOf}</strong>
        <span>{marketData.dataNotice}</span>
      </p>

      <StockComparison stocks={marketData.stockSearchItems} />
    </main>
  );
}
