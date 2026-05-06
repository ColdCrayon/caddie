import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SafeArea } from '../components/layout/SafeArea'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { SkeletonCard } from '../components/ui/SkeletonLoader'
import { ScoreLabel } from '../components/round/ScoreLabel'
import { useRound } from '../hooks/useRound'
import type { HolePlayed, ScoreLabel as SL } from '../types'

export default function RoundDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: round, isLoading } = useRound(id)

  if (isLoading) {
    return (
      <SafeArea>
        <PageHeader title="Round" back />
        <div className="px-4 py-4 space-y-3">
          <SkeletonCard /><SkeletonCard />
        </div>
      </SafeArea>
    )
  }

  if (!round) return null

  const totalPar = round.holes_played?.reduce((t: number, h: HolePlayed) => t + h.par, 0) ?? 72
  const diff = (round.total_score ?? 0) - totalPar
  const gir = round.holes_played?.filter((h: HolePlayed) => h.gir).length ?? 0
  const fir = round.holes_played?.filter((h: HolePlayed) => h.fairway_hit).length ?? 0
  const putts = round.holes_played?.reduce((t: number, h: HolePlayed) => t + h.putts, 0) ?? 0
  const par4s = round.holes_played?.filter((h: HolePlayed) => h.par === 4).length ?? 1

  return (
    <SafeArea>
      <PageHeader
        title={(round as unknown as { course?: { name?: string } }).course?.name ?? 'Round'}
        subtitle={new Date(round.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        back
      />

      <div className="px-4 py-4 space-y-4">
        {/* Score hero */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 text-center">
            <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest">Total Score</p>
            <p className="font-mono text-chalk text-7xl font-bold my-2">{round.total_score}</p>
            <p className={`font-mono text-2xl font-bold ${diff <= 0 ? 'text-birdie' : 'text-bogey'}`}>
              {diff === 0 ? 'Even' : diff > 0 ? `+${diff}` : diff}
            </p>
            <p className="font-ui text-chalk/40 text-sm mt-1 capitalize">{round.tee_color} tees</p>
          </Card>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'GIR', value: `${gir}/18` },
            { label: 'FIR', value: `${fir}/${par4s}` },
            { label: 'Putts', value: putts },
            { label: 'Diff', value: round.score_differential?.toFixed(1) ?? '—' },
          ].map((s) => (
            <Card key={s.label} className="p-3 text-center">
              <p className="font-mono text-sand text-xl font-bold">{s.value}</p>
              <p className="font-ui text-chalk/40 text-[10px] uppercase tracking-wider mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Scorecard */}
        <div>
          <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest mb-2">Scorecard</p>
          <Card className="overflow-hidden">
            <div className="grid grid-cols-5 gap-0 text-center border-b border-white/10 py-2 px-2">
              {['Hole', 'Par', 'Yds', 'Score', 'Label'].map((h) => (
                <span key={h} className="font-ui text-chalk/40 text-[10px] uppercase">{h}</span>
              ))}
            </div>
            {round.holes_played?.map((hole: HolePlayed) => {
              const diff2 = hole.strokes - hole.par
              return (
                <div
                  key={hole.hole_number}
                  className="grid grid-cols-5 gap-0 text-center py-2.5 px-2 border-b border-white/5 last:border-0"
                >
                  <span className="font-mono text-chalk/60 text-sm">{hole.hole_number}</span>
                  <span className="font-mono text-chalk/60 text-sm">{hole.par}</span>
                  <span className="font-mono text-chalk/60 text-sm">{hole.yardage}</span>
                  <span className={`font-mono text-sm font-bold ${
                    diff2 <= -2 ? 'text-eagle' : diff2 === -1 ? 'text-birdie' : diff2 === 0 ? 'text-chalk' : 'text-bogey'
                  }`}>
                    {hole.strokes}
                  </span>
                  <span className="flex justify-center">
                    <ScoreLabel label={hole.score_label as SL} />
                  </span>
                </div>
              )
            })}
          </Card>
        </div>
      </div>
    </SafeArea>
  )
}
