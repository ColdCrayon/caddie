import type { GreenDistances } from '../../lib/gps'

interface DistanceDisplayProps {
  distances: GreenDistances | null
  updating?: boolean
  accuracy?: number
}

export function DistanceDisplay({ distances, updating = false, accuracy }: DistanceDisplayProps) {
  if (!distances) {
    return (
      <div className="flex flex-col items-center py-8">
        <p className="font-ui text-fog text-xs uppercase tracking-widest mb-3">Distance to Green</p>
        <p className="font-display text-fog/40" style={{ fontSize: 56, lineHeight: 1 }}>—</p>
        <p className="font-ui text-fog/40 text-xs mt-2">Tap map to set target</p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center py-6 ${updating ? 'dist-active' : ''}`}>
      <p className="font-ui text-fog text-xs uppercase tracking-widest mb-1">Distance to Green</p>

      {/* Front / Middle / Back row */}
      <div className="flex items-end justify-center gap-6 mt-2">
        {/* Front */}
        <div className="flex flex-col items-center gap-1">
          <span className="font-ui text-fog text-xs uppercase tracking-wider">Front</span>
          <span
            className="font-display text-fog tabular-nums"
            style={{ fontSize: 40, lineHeight: 1 }}
          >
            {distances.front}
          </span>
          <span className="font-ui text-fog/50 text-xs">yds</span>
        </div>

        {/* Middle — primary */}
        <div className="flex flex-col items-center gap-1 relative">
          <span className="font-ui text-chalk text-xs uppercase tracking-wider">Middle</span>
          <span
            className="font-display text-chalk tabular-nums"
            style={{ fontSize: 56, lineHeight: 1 }}
          >
            {distances.middle}
          </span>
          {/* Sand underline */}
          <div style={{ width: 40, height: 2, background: '#C9A96E', borderRadius: 1 }} />
          <span className="font-ui text-fog/50 text-xs">yds</span>
        </div>

        {/* Back */}
        <div className="flex flex-col items-center gap-1">
          <span className="font-ui text-fog text-xs uppercase tracking-wider">Back</span>
          <span
            className="font-display text-fog tabular-nums"
            style={{ fontSize: 40, lineHeight: 1 }}
          >
            {distances.back}
          </span>
          <span className="font-ui text-fog/50 text-xs">yds</span>
        </div>
      </div>

      {/* GPS accuracy indicator */}
      {accuracy != null && (
        <p className="font-ui text-fog/40 text-xs mt-3">
          ±{Math.round(accuracy)}m GPS accuracy
        </p>
      )}
    </div>
  )
}
