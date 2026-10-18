import Link from "next/link";
import { StockComparison } from "@/components/StockComparison";
import { loadMarketSnapshot } from "@/lib/marketData";
import { requestDataGoKr } from "@/lib/dataGoKr";
import { readLatestDailyPrices } from "@/lib/supabaseMarketData";
import { comparisonStocks } from "@/lib/comparison";

export const dynamic = "force-dynamic";

export default async function Compare() {
  const snapshot = await loadMarketSnapshot(requestDataGoKr, readLatestDailyPrices);
  return <main className="dashboard-shell">
    <header className="dashboard-header">
      <div><p className="date-label"><Link href="/">← 시장 홈</Link></p><h1>종목 비교</h1></div>
      <div className="data-status"><time>{snapshot.asOf} 기준</time>{snapshot.isMock && <span className="mock-badge">예시 데이터</span>}</div>
    </header>
    <StockComparison stocks={comparisonStocks(snapshot)} />
    <footer>{snapshot.isMock ? "시세를 불러오지 못해 표시한 예시 데이터이며 실제 투자 정보가 아닙니다. " : "수집된 일별 시세 기준입니다. "}현재가는 최근 수집된 일별 종가로, 실시간 시세가 아닙니다. 오늘 등락률은 해당 기준일의 전 거래일 대비 등락률입니다.</footer>
  </main>;
}
