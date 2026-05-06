interface HeatmapGridProps {
  data: { hole: number; avgDiff: number | null }[]
}

function diffColor(diff: number | null): string {
  if (diff === null) return 'bg-rough/30'
  if (diff <= -1) return 'bg-birdie/60'
  if (diff === 0) return 'bg-chalk/20'
  if (diff <= 1) return 'bg-bogey/40'
  return 'bg-bogey/70'
}

function diffLabel(diff: number | null): string {
  if (diff === null) return '—'
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)
}

export function HeatmapGrid({ data }: HeatmapGridProps) {
  return (
    <div>
      <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest mb-3">
        Hole Performance
      </p>
      <div className="grid grid-cols-9 gap-1">
        {data.map((d) => (
          <div
            key={d.hole}
            className={`${diffColor(d.avgDiff)} rounded-lg aspect-square flex flex-col items-center justify-center`}
          >
            <span className="font-ui text-[9px] text-chalk/50 leading-none">{d.hole}</span>
            <span className="font-mono text-[10px] text-chalk font-bold leading-none mt-0.5">
              {diffLabel(d.avgDiff)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
