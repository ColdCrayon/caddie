import type { ActiveHoleState, TeeColor } from '../../types'
import { useRoundStore } from '../../stores/roundStore'
import { getScoreLabel } from '../../lib/handicap'
import { ScoreButton } from './ScoreButton'
import { ScoreLabel } from './ScoreLabel'
import { Card } from '../ui/Card'

const TEE_COLORS: { value: TeeColor; label: string; className: string }[] = [
  { value: 'black', label: 'BLK', className: 'bg-black border-white/20 text-white' },
  { value: 'blue', label: 'BLU', className: 'bg-sky/80 border-sky text-ink' },
  { value: 'white', label: 'WHT', className: 'bg-white border-white text-ink' },
  { value: 'red', label: 'RED', className: 'bg-bogey border-bogey text-white' },
]

interface HoleCardProps {
  hole: ActiveHoleState
  index: number
  teeColor: TeeColor
}

export function HoleCard({ hole, index, teeColor }: HoleCardProps) {
  const updateHole = useRoundStore((s) => s.updateHole)

  const scoreLabel = hole.strokes > 0 ? getScoreLabel(hole.strokes, hole.par) : undefined

  const toggle = (field: 'fairwayHit' | 'gir' | 'sandSave') => {
    updateHole(index, { [field]: !hole[field] })
  }

  const yardage = hole.yardage

  return (
    <Card className="mx-4 p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-ui text-chalk/50 text-xs uppercase tracking-widest">Hole</p>
          <p className="font-mono text-sand text-5xl font-bold leading-none">{hole.holeNumber}</p>
        </div>
        <div className="text-right">
          <p className="font-ui text-chalk/50 text-xs uppercase tracking-widest">Par</p>
          <p className="font-mono text-chalk text-3xl font-bold">{hole.par}</p>
        </div>
        <div className="text-right">
          <p className="font-ui text-chalk/50 text-xs uppercase tracking-widest">Yards</p>
          <p className="font-mono text-chalk text-3xl font-bold">{yardage}</p>
        </div>
      </div>

      {/* Tee selector */}
      <div>
        <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest mb-2">Tee</p>
        <div className="flex gap-2">
          {TEE_COLORS.map((t) => (
            <button
              key={t.value}
              onClick={() => {}} // tee color is round-level, handled above
              className={`px-3 py-1.5 rounded-lg border text-xs font-ui font-semibold
                ${teeColor === t.value ? `${t.className} ring-1 ring-sand` : 'bg-rough/50 border-white/10 text-chalk/40'}
              `}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Score counters */}
      <div className="flex justify-around pt-1">
        <ScoreButton
          label="Strokes"
          value={hole.strokes}
          min={0}
          onDecrement={() => updateHole(index, { strokes: Math.max(0, hole.strokes - 1) })}
          onIncrement={() => updateHole(index, { strokes: hole.strokes + 1 })}
        />
        <ScoreButton
          label="Putts"
          value={hole.putts}
          min={0}
          onDecrement={() => updateHole(index, { putts: Math.max(0, hole.putts - 1) })}
          onIncrement={() => updateHole(index, { putts: hole.putts + 1 })}
        />
      </div>

      {/* Score label */}
      {scoreLabel && (
        <div className="flex justify-center">
          <ScoreLabel label={scoreLabel} />
        </div>
      )}

      {/* Stat toggles */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { key: 'fairwayHit' as const, label: 'FIR', value: hole.fairwayHit },
          { key: 'gir' as const, label: 'GIR', value: hole.gir },
          { key: 'sandSave' as const, label: 'Sand', value: hole.sandSave },
        ].map(({ key, label, value }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`py-2.5 rounded-xl border font-ui text-sm font-medium transition-colors
              ${value
                ? 'bg-birdie/20 border-birdie/40 text-birdie'
                : 'bg-rough/50 border-white/10 text-chalk/40'
              }`}
          >
            {label}
          </button>
        ))}
      </div>
    </Card>
  )
}
