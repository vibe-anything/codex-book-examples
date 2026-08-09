export function Sparkline({ values, tone, label, indexCode }) {
  const width = 220;
  const height = 54;
  const padding = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = padding + (index / (values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
  const areaPoints = `${padding},${height - 1} ${points} ${width - padding},${height - 1}`;
  const lastPoint = points.split(" ").at(-1).split(",");
  const gradientId = `sparkline-area-${indexCode}`;

  return (
    <svg className={`sparkline ${tone}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1={height - 1} x2={width} y2={height - 1} className="sparkline-base" />
      <polygon points={areaPoints} className="sparkline-area" fill={`url(#${gradientId})`} />
      <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
      <circle cx={lastPoint[0]} cy={lastPoint[1]} r="3.25" className="sparkline-end" />
    </svg>
  );
}
