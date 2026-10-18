import { MarketDashboard } from "@/components/MarketDashboard";
import { loadMarketSnapshot } from "@/lib/marketData";
import { requestDataGoKr } from "@/lib/dataGoKr";

import { readLatestDailyPrices } from "@/lib/supabaseMarketData";

export const dynamic = "force-dynamic";

export default async function Home() {
  const snapshot = await loadMarketSnapshot(requestDataGoKr, readLatestDailyPrices);
  return <MarketDashboard snapshot={snapshot} />;
}
