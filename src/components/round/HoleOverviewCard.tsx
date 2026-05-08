import { useEffect, useState } from 'react'
import type { PlaysLike } from '../../types'

interface HoleOverviewCardProps {
  holeNumber: number
  par: number
  yardage: number
  distToPin: number | null
  playsLike: PlaysLike | null
  gamePlanTip: string | null
  onDismiss: () => void
}

export function HoleOverviewCard({
  holeNumber,
  par,
  yardage,
  distToPin,
  playsLike,
  gamePlanTip,
  onDismiss,
}: HoleOverviewCardProps) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const DURATION = 3000
    const TICK = 50
    let elapsed = 0
    const timer = setInterval(() => {
      elapsed += TICK
      setProgress(Math.max(0, 100 - (elapsed / DURATION) * 100))
      if (elapsed >= DURATION) {
        clearInterval(timer)
        onDismiss()
      }
    }, TICK)
    return () => clearInterval(timer)
  }, [onDismiss])

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center px-4"
      style={{ background: 'rgba(14,22,14,0.88)', backdropFilter: 'blur(8px)' }}
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 30% 10%, #243824 0%, #161F16 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div style={{ height: 2, background: 'rgba(255,255,255,0.08)' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: '#C9A96E',
              transition: 'width 0.05s linear',
            }}
          />
        </div>

        <div className="px-6 pt-6 pb-5">
          {/* Hole number */}
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="font-ui text-fog text-xs uppercase tracking-widest mb-1">Hole</p>
              <p className="font-display text-sand leading-none" style={{ fontSize: 72, fontWeight: 700, lineHeight: 1 }}>
                {holeNumber}
              </p>
            </div>
            <div className="text-right pb-2">
              <p className="font-ui text-fog text-xs uppercase tracking-widest mb-1">Par</p>
              <p className="font-display text-chalk text-4xl font-bold">{par}</p>
            </div>
          </div>

          {/* Stats row */}
          <div
            className="grid grid-cols-3 gap-3 py-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-center">
              <p className="font-ui text-fog/60 text-xs uppercase tracking-widest mb-1">Yards</p>
              <p className="font-display text-chalk text-xl font-bold">{yardage}</p>
            </div>
            {distToPin != null ? (
              <div className="text-center">
                <p className="font-ui text-fog/60 text-xs uppercase tracking-widest mb-1">To Pin</p>
                <p className="font-display text-chalk text-xl font-bold">{Math.round(distToPin)}</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="font-ui text-fog/60 text-xs uppercase tracking-widest mb-1">To Pin</p>
                <p className="font-display text-fog/30 text-xl font-bold">—</p>
              </div>
            )}
            {playsLike ? (
              <div className="text-center">
                <p className="font-ui text-fog/60 text-xs uppercase tracking-widest mb-1">Plays Like</p>
                <p className="font-display text-sky text-xl font-bold">{playsLike.distance}</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="font-ui text-fog/60 text-xs uppercase tracking-widest mb-1">Plays Like</p>
                <p className="font-display text-fog/30 text-xl font-bold">—</p>
              </div>
            )}
          </div>

          {/* Game plan tip */}
          {gamePlanTip && (
            <p className="font-ui text-chalk/60 text-sm leading-relaxed mt-4">
              <span className="text-sand">Tip: </span>{gamePlanTip}
            </p>
          )}

          <button
            onClick={onDismiss}
            className="mt-4 w-full py-2 font-ui text-xs text-fog/40 uppercase tracking-widest cursor-pointer"
          >
            Tap to skip
          </button>
        </div>
      </div>
    </div>
  )
}
