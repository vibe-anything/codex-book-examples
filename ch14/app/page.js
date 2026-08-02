import { MarketDashboard } from "@/components/MarketDashboard";
import { getMarketSnapshot } from "@/lib/marketData";

export default async function Home() {
  const snapshot = await getMarketSnapshot();
  return <MarketDashboard snapshot={snapshot} />;
}
