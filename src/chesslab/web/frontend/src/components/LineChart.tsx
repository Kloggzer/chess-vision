type Series = { name: string; color: string; data: { x: number; y: number }[] };

export default function LineChart({
  series,
  yMin = 0,
  yMax = 1,
}: {
  series: Series[];
  yMin?: number;
  yMax?: number;
}) {
  const W = 600, H = 200, p = 30;
  const xs = series.flatMap((s) => s.data.map((d) => d.x));
  const xMax = Math.max(1, ...xs);
  const sx = (x: number) => p + ((W - 2 * p) * x) / xMax;
  const sy = (y: number) => H - p - ((H - 2 * p) * (y - yMin)) / Math.max(1e-9, yMax - yMin);
  const ticks = 4;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }} preserveAspectRatio="none">
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const y = yMin + ((yMax - yMin) * i) / ticks;
          return (
            <g key={i}>
              <line x1={p} y1={sy(y)} x2={W - p} y2={sy(y)} stroke="#27272a" strokeWidth={1} />
              <text x={4} y={sy(y) + 3} fill="#71717a" fontSize={10}>
                {y.toFixed(yMax <= 1 ? 2 : 1)}
              </text>
            </g>
          );
        })}
        {series.map((s) =>
          s.data.length ? (
            <polyline
              key={s.name}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              points={s.data.map((d) => `${sx(d.x).toFixed(1)},${sy(d.y).toFixed(1)}`).join(" ")}
            />
          ) : null
        )}
      </svg>
      <div className="mt-1 flex flex-wrap gap-4 text-xs text-zinc-400">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
