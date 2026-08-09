import { Sparkline } from "./Sparkline";
import { changeTone, formatNumber, formatSigned } from "@/lib/market";

export function IndexCard({ index }) {
  const tone = changeTone(index.changePercent);

  return (
    <article className="index-card panel" aria-labelledby={`${index.code}-title`}>
      <div className="index-copy">
        <p className="eyebrow" id={`${index.code}-title`}>{index.name}</p>
        <p className="index-value">{formatNumber(index.value, 2)}</p>
        <p className={`index-change ${tone}`}>
          <span>{formatSigned(index.change, 2)}</span>
          <span className="change-badge">{formatSigned(index.changePercent, 2)}%</span>
        </p>
      </div>
      <Sparkline
        values={index.intraday}
        tone={tone}
        indexCode={index.code}
        label={`${index.name} 장중 흐름, ${tone === "up" ? "상승" : tone === "down" ? "하락" : "보합"}`}
      />
    </article>
  );
}
