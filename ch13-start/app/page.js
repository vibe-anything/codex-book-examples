import { MarketDashboard } from "@/components/MarketDashboard";
import { marketSnapshot } from "@/data/marketSnapshot";

export default function Home() {
  return <MarketDashboard snapshot={marketSnapshot} />;
}
