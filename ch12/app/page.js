import { MarketDashboard } from "@/components/MarketDashboard";
import { loadMarketSnapshot } from "@/lib/marketData";
import { requestDataGoKr } from "@/lib/dataGoKr";

export const dynamic = "force-dynamic";

export default async function Home() {
  const snapshot = await loadMarketSnapshot(requestDataGoKr);
  return <MarketDashboard snapshot={snapshot} />;
}
