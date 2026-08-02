import { StockComparison } from "@/components/StockComparison";
import { getDashboardSnapshot } from "@/lib/marketData";

export const metadata = {
  title: "종목 비교 | 오늘의 국내 시장",
  description: "두 국내 종목의 현재가와 오늘 등락률 비교",
};

export default async function ComparePage() {
  const snapshot = await getDashboardSnapshot();
  return <StockComparison snapshot={snapshot} />;
}
