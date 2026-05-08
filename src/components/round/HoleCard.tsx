import type { ActiveHoleState, TeeColor } from '../../types' // TeeColor kept for prop type
import { useRoundStore } from '../../stores/roundStore'
import { getScoreLabel } from '../../lib/handicap'
import { ScoreButton } from './ScoreButton'
import { ScoreLabel } from './ScoreLabel'
import { Card } from '../ui/Card'

interface HoleCardProps {
  hole: ActiveHoleState
  index: number
  teeColor?: TeeColor
}

export function HoleCard({ hole, index }: HoleCardProps) {
  const updateHole = useRoundStore((s) => s.updateHole)

  const scoreLabel = hole.strokes > 0 ? getScoreLabel(hole.strokes, hole.par) : undefined

  const toggle = (field: 'fairwayHit' | 'gir' | 'sandSave') => {
    updateHole(index, { [field]: !hole[field] })
  }

  return (
    <Card className="mx-4 overflow-hidden">
      {/* Hole number + meta header */}
      <div className="relative px-5 pt-5 pb-4">
        {/* Decorative ghost number */}
        <span
          className="absolute right-4 top-0 font-display font-bold text-chalk/[0.04] select-none pointer-events-none leading-none"
          style={{ fontSize: 120 }}
          aria-hidden
        >
          {hole.holeNumber}
        </span>

        <div className="relative flex items-end justify-between">
          <div>
            <p className="font-ui text-fog text-xs uppercase tracking-widest mb-1">Hole</p>
            <p className="font-display text-sand leading-none" style={{ fontSize: 64, fontWeight: 700 }}>
              {hole.holeNumber}
            </p>
          </div>

          <div className="flex gap-6 pb-2">
            <div className="text-right">
              <p className="font-ui text-fog text-xs uppercase tracking-widest">Par</p>
              <p className="font-display text-chalk text-3xl font-bold">{hole.par}</p>
            </div>
            <div className="text-right">
              <p className="font-ui text-fog text-xs uppercase tracking-widest">Yards</p>
              <p className="font-display text-chalk text-3xl font-bold">
                {hole.yardage ?? '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Sand rule line */}
        <div className="mt-1" style={{ width: 40, height: 1, background: '#C9A96E' }} />
      </div>

      {/* Score counters */}
      <div
        className="px-5 py-6 flex justify-around"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <ScoreButton
          label="Strokes"
          value={hole.strokes}
          min={0}
          onDecrement={() => updateHole(index, { strokes: Math.max(0, hole.strokes - 1) })}
          onIncrement={() => updateHole(index, { strokes: hole.strokes + 1 })}
        />
        <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
        <ScoreButton
          label="Putts"
          value={hole.putts}
          min={0}
          onDecrement={() => updateHole(index, { putts: Math.max(0, hole.putts - 1) })}
          onIncrement={() => updateHole(index, { putts: hole.putts + 1 })}
        />
      </div>

      {/* Score label badge */}
      {scoreLabel && (
        <div
          className="flex justify-center pb-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="pt-4">
            <ScoreLabel label={scoreLabel} />
          </div>
        </div>
      )}

      {/* Stat toggles */}
      <div
        className="grid grid-cols-3 gap-2 px-5 pb-5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: scoreLabel ? 0 : 20 }}
      >
        {[
          { key: 'fairwayHit' as const, label: 'FIR', value: hole.fairwayHit },
          { key: 'gir' as const, label: 'GIR', value: hole.gir },
          { key: 'sandSave' as const, label: 'Sand', value: hole.sandSave },
        ].map(({ key, label, value }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className="py-3 rounded font-ui text-sm font-semibold uppercase tracking-wider
                       transition-all duration-150 active:scale-[0.96] cursor-pointer"
            style={{
              border: value ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.08)',
              background: value ? 'rgba(74,222,128,0.12)' : 'rgba(22,31,22,0.6)',
              color: value ? '#4ADE80' : 'rgba(237,233,223,0.35)',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </Card>
  )
}
