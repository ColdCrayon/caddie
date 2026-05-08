import type { GreenDistances } from '../../lib/gps'
import type { PlaysLike } from '../../types'

interface DistanceDisplayProps {
  distances: GreenDistances | null
  playsLike: PlaysLike | null
  pinIsCustom: boolean
  updating?: boolean
  accuracy?: number
  onResetPin?: () => void
}

export function DistanceDisplay({
  distances,
  playsLike,
  pinIsCustom,
  updating = false,
  accuracy,
  onResetPin,
}: DistanceDisplayProps) {
  if (!distances) {
    return (
      <div className="flex flex-col items-center py-8">
        <p className="font-ui text-fog text-xs uppercase tracking-widest mb-3">Distance to Pin</p>
        <p className="font-display text-fog/40" style={{ fontSize: 56, lineHeight: 1 }}>—</p>
        <p className="font-ui text-fog/40 text-xs mt-2">Acquiring GPS…</p>
      </div>
    )
  }

  const elevDiff = playsLike?.elevDiffFt ?? 0
  const isUphill = elevDiff > 0.5
  const isDownhill = elevDiff < -0.5
  const hasElev = isUphill || isDownhill

  return (
    <div className={`flex flex-col items-center py-5 ${updating ? 'dist-active' : ''}`}>

      {/* Label row */}
      <div className="flex items-center gap-2 mb-1">
        <p className="font-ui text-fog text-xs uppercase tracking-widest">To Pin</p>
        {pinIsCustom && (
          <span className="font-ui text-sand/70 text-[10px] uppercase tracking-wider">Custom</span>
        )}
        {!pinIsCustom && (
          <span className="font-ui text-fog/40 text-[10px] uppercase tracking-wider">Est. center</span>
        )}
      </div>

      {/* Hero yardage */}
      <span
        className="font-display text-chalk tabular-nums leading-none"
        style={{ fontSize: 72 }}
      >
        {distances.middle}
      </span>
      <div style={{ width: 48, height: 2, background: '#C9A96E', borderRadius: 1, marginTop: 4 }} />
      <span className="font-ui text-fog/50 text-xs mt-1">yards</span>

      {/* Plays Like row */}
      {playsLike && (
        <div className="flex items-center gap-2 mt-3">
          <span className="font-ui text-sky text-sm font-semibold">
            Plays {playsLike.distance}y
          </span>
          {hasElev && (
            <span className="font-ui text-xs" style={{ color: isUphill ? '#F87171' : '#4ADE80' }}>
              {isUphill ? '▲' : '▼'} {Math.abs(Math.round(elevDiff))}ft
            </span>
          )}
          {hasElev && (
            <span className="font-ui text-fog/40 text-[10px]">{playsLike.grade}%</span>
          )}
        </div>
      )}

      {/* Front / Back secondary */}
      <div className="flex items-center gap-8 mt-4">
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-ui text-fog text-[10px] uppercase tracking-wider">Front</span>
          <span className="font-display text-fog tabular-nums" style={{ fontSize: 28, lineHeight: 1 }}>
            {distances.front}
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-ui text-fog text-[10px] uppercase tracking-wider">Back</span>
          <span className="font-display text-fog tabular-nums" style={{ fontSize: 28, lineHeight: 1 }}>
            {distances.back}
          </span>
        </div>
      </div>

      {/* Reset + accuracy row */}
      <div className="flex items-center gap-4 mt-3">
        {pinIsCustom && onResetPin && (
          <button
            onClick={onResetPin}
            className="font-ui text-[10px] text-sand/60 uppercase tracking-wider underline underline-offset-2 cursor-pointer"
          >
            Reset pin
          </button>
        )}
        {accuracy != null && (
          <p className="font-ui text-fog/30 text-[10px]">±{Math.round(accuracy)}m GPS</p>
        )}
      </div>
    </div>
  )
}
