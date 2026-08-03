import { MarketDashboard } from "@/components/MarketDashboard";
import { getDashboardSnapshot } from "@/lib/marketData";

export const revalidate = 3600;

export default async function Home() {
  const snapshot = await getDashboardSnapshot();
  return <MarketDashboard snapshot={snapshot} />;
}
