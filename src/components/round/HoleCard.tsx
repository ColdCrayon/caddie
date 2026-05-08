import type { ActiveHoleState, TeeColor } from '../../types' // TeeColor kept for prop type
import { useRoundStore } from '../../stores/roundStore'
import { getScoreLabel } from '../../lib/handicap'
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
          className="absolute right-3 top-0 font-display font-bold text-chalk/[0.04] select-none pointer-events-none leading-none"
          style={{ fontSize: 110 }}
          aria-hidden
        >
          {hole.holeNumber}
        </span>

        <div className="relative flex items-end justify-between">
          <div>
            <p className="font-ui text-fog text-xs uppercase tracking-widest mb-1">Hole</p>
            <p className="font-display text-sand leading-none" style={{ fontSize: 60, fontWeight: 700 }}>
              {hole.holeNumber}
            </p>
          </div>
          <div className="flex gap-5 pb-2">
            <div className="text-right">
              <p className="font-ui text-fog text-xs uppercase tracking-widest">Par</p>
              <p className="font-display text-chalk text-3xl font-bold">{hole.par}</p>
            </div>
            <div className="text-right">
              <p className="font-ui text-fog text-xs uppercase tracking-widest">Yards</p>
              <p className="font-display text-chalk text-3xl font-bold">{hole.yardage ?? '—'}</p>
            </div>
          </div>
        </div>
        <div className="mt-1" style={{ width: 40, height: 1, background: '#C9A96E' }} />
      </div>

      {/* Primary: Total strokes — full width, centred */}
      <div
        className="px-5 py-6 flex flex-col items-center gap-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <p className="font-ui text-fog text-xs uppercase tracking-widest">Total Strokes</p>
        <div className="flex items-center gap-6">
          <button
            onClick={() => {
              const next = Math.max(0, hole.strokes - 1)
              // Putts can't exceed strokes — pull putts down with strokes if needed
              updateHole(index, { strokes: next, putts: Math.min(hole.putts, next) })
            }}
            disabled={hole.strokes <= 0}
            className="flex items-center justify-center transition-all duration-150 select-none
                       active:scale-[0.92] disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
            style={{
              width: 72, height: 72, borderRadius: '50%',
              border: '1.5px solid rgba(201,169,110,0.3)',
              background: 'rgba(36,56,36,0.6)',
              color: '#C9A96E', fontSize: 32, fontWeight: 300,
            }}
          >−</button>

          <div className="flex flex-col items-center gap-1">
            <span className="font-display text-chalk tabular-nums" style={{ fontSize: 64, lineHeight: 1, minWidth: 56, textAlign: 'center' }}>
              {hole.strokes || '—'}
            </span>
            {scoreLabel && <ScoreLabel label={scoreLabel} />}
          </div>

          <button
            onClick={() => updateHole(index, { strokes: hole.strokes + 1 })}
            className="flex items-center justify-center transition-all duration-150 select-none
                       active:scale-[0.92] cursor-pointer"
            style={{
              width: 72, height: 72, borderRadius: '50%',
              border: '1.5px solid rgba(201,169,110,0.3)',
              background: 'rgba(36,56,36,0.6)',
              color: '#C9A96E', fontSize: 32, fontWeight: 300,
            }}
          >+</button>
        </div>
      </div>

      {/* Secondary: Putts — compact row, linked to total strokes */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div>
          <p className="font-ui text-fog text-xs uppercase tracking-widest">Putts</p>
          <p className="font-ui text-fog/50 text-xs mt-0.5">Counted in total strokes</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => updateHole(index, {
              putts: Math.max(0, hole.putts - 1),
              strokes: Math.max(0, hole.strokes - 1),
            })}
            disabled={hole.putts <= 0}
            className="flex items-center justify-center transition-all active:scale-[0.92]
                       disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
            style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(22,31,22,0.8)',
              color: '#8A9E8A', fontSize: 22, fontWeight: 300,
            }}
          >−</button>

          <span className="font-display text-chalk text-2xl tabular-nums" style={{ minWidth: 28, textAlign: 'center' }}>
            {hole.putts}
          </span>

          <button
            onClick={() => updateHole(index, {
              putts: hole.putts + 1,
              strokes: hole.strokes + 1,
            })}
            className="flex items-center justify-center transition-all active:scale-[0.92] cursor-pointer"
            style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(22,31,22,0.8)',
              color: '#8A9E8A', fontSize: 22, fontWeight: 300,
            }}
          >+</button>
        </div>
      </div>

      {/* Stat toggles — plain English labels */}
      <div
        className="grid grid-cols-3 gap-2 px-5 py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {[
          { key: 'fairwayHit' as const, label: 'Fairway', sub: 'Hit off tee',    value: hole.fairwayHit },
          { key: 'gir'        as const, label: 'Green',   sub: 'In regulation',  value: hole.gir },
          { key: 'sandSave'   as const, label: 'Bunker',  sub: 'Up & down',      value: hole.sandSave },
        ].map(({ key, label, sub, value }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className="flex flex-col items-center py-3 px-1 rounded transition-all duration-150
                       active:scale-[0.96] cursor-pointer"
            style={{
              border: value ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.08)',
              background: value ? 'rgba(74,222,128,0.12)' : 'rgba(22,31,22,0.6)',
            }}
          >
            <span
              className="font-ui font-semibold uppercase tracking-wider text-xs"
              style={{ color: value ? '#4ADE80' : 'rgba(237,233,223,0.5)' }}
            >
              {label}
            </span>
            <span
              className="font-ui text-xs mt-0.5"
              style={{ color: value ? 'rgba(74,222,128,0.6)' : 'rgba(138,158,138,0.4)', fontSize: 10 }}
            >
              {sub}
            </span>
          </button>
        ))}
      </div>
    </Card>
  )
}
