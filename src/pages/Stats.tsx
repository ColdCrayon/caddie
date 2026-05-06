import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { SafeArea } from '../components/layout/SafeArea'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/stats/StatCard'
import { HeatmapGrid } from '../components/stats/HeatmapGrid'
import { HandicapChart } from '../components/stats/HandicapChart'
import { SkeletonCard } from '../components/ui/SkeletonLoader'
import { useUserStore } from '../stores/userStore'
import { useRounds } from '../hooks/useRound'
import { useClubDistanceAverages } from '../hooks/useShots'
import { handicapIndex } from '../lib/handicap'
import { CLUBS, CLUB_LABELS } from '../types'

export default function Stats() {
  const user = useUserStore((s) => s.user)
  const { data: rounds, isLoading } = useRounds(user?.id)
  const { data: clubAverages } = useClubDistanceAverages(user?.id)

  const completedRounds = useMemo(
    () => rounds?.filter((r) => r.completed) ?? [],
    [rounds]
  )

  const last20 = completedRounds.slice(0, 20)
  const handicap = useMemo(() => {
    const diffs = last20
      .filter((r) => r.score_differential !== null)
      .map((r) => r.score_differential as number)
    return handicapIndex(diffs)
  }, [last20])

  const handicapTrend = useMemo(() => {
    const points: { date: string; index: number }[] = []
    for (let i = Math.min(completedRounds.length, 20); i >= 5; i--) {
      const slice = completedRounds.slice(0, i)
      const diffs = slice.filter((r) => r.score_differential !== null).map((r) => r.score_differential as number)
      const hi = handicapIndex(diffs)
      points.unshift({
        date: new Date(completedRounds[i - 1]?.date ?? '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        index: hi,
      })
    }
    return points
  }, [completedRounds])

  const avgScore = useMemo(() => {
    if (!completedRounds.length) return null
    return (completedRounds.slice(0, 10).reduce((t, r) => t + (r.total_score ?? 0), 0) / Math.min(completedRounds.length, 10)).toFixed(1)
  }, [completedRounds])

  const heatmapData = useMemo(() => {
    const byHole: Record<number, number[]> = {}
    for (const round of completedRounds.slice(0, 20)) {
      for (const hole of (round.holes_played ?? [])) {
        if (!byHole[hole.hole_number]) byHole[hole.hole_number] = []
        byHole[hole.hole_number].push(hole.strokes - hole.par)
      }
    }
    return Array.from({ length: 18 }, (_, i) => {
      const diffs = byHole[i + 1] ?? []
      return {
        hole: i + 1,
        avgDiff: diffs.length
          ? Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10) / 10
          : null,
      }
    })
  }, [completedRounds])

  const girPct = useMemo(() => {
    const allHoles = completedRounds.slice(0, 20).flatMap((r) => r.holes_played ?? [])
    if (!allHoles.length) return null
    return Math.round((allHoles.filter((h) => h.gir).length / allHoles.length) * 100)
  }, [completedRounds])

  const firPct = useMemo(() => {
    const par4s = completedRounds.slice(0, 20).flatMap((r) => (r.holes_played ?? []).filter((h) => h.par === 4))
    if (!par4s.length) return null
    return Math.round((par4s.filter((h) => h.fairway_hit).length / par4s.length) * 100)
  }, [completedRounds])

  const avgPutts = useMemo(() => {
    const all = completedRounds.slice(0, 20)
    if (!all.length) return null
    const totals = all.map((r) => (r.holes_played ?? []).reduce((t, h) => t + h.putts, 0))
    return (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1)
  }, [completedRounds])

  if (isLoading) {
    return (
      <SafeArea>
        <PageHeader title="Stats" />
        <div className="px-4 py-4 space-y-3">
          <SkeletonCard /><SkeletonCard />
        </div>
      </SafeArea>
    )
  }

  return (
    <SafeArea>
      <PageHeader title="Stats" subtitle="Mission Control" />
      <div className="px-4 py-4 space-y-5">
        {/* KPI row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          <StatCard label="Handicap Index" value={handicap || '—'} sub={`${last20.length} rounds`} />
          <StatCard label="Scoring Avg" value={avgScore ?? '—'} sub="Last 10 rounds" />
          <StatCard label="GIR %" value={girPct !== null ? `${girPct}%` : '—'} color="text-birdie" />
          <StatCard label="FIR %" value={firPct !== null ? `${firPct}%` : '—'} color="text-sky" />
          <StatCard label="Avg Putts" value={avgPutts ?? '—'} color="text-chalk" />
        </motion.div>

        {/* Handicap trend */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-4">
            <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest mb-3">Handicap Trend</p>
            <HandicapChart data={handicapTrend} />
          </Card>
        </motion.div>

        {/* Hole heatmap */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-4">
            <HeatmapGrid data={heatmapData} />
          </Card>
        </motion.div>

        {/* Club distances */}
        {clubAverages && Object.keys(clubAverages).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-4">
              <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest mb-3">Club Distances</p>
              <div className="grid grid-cols-3 gap-2">
                {CLUBS.filter((c) => clubAverages[c]).map((c) => (
                  <div key={c} className="bg-ink/40 rounded-xl p-2 text-center">
                    <p className="font-mono text-sand text-xl font-bold">{clubAverages[c]}</p>
                    <p className="font-ui text-chalk/40 text-[10px] mt-0.5">{CLUB_LABELS[c]}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Round history sparklines */}
        {completedRounds.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="p-4">
              <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest mb-3">Score History</p>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart
                  data={completedRounds.slice(0, 10).reverse().map((r) => ({
                    score: r.total_score,
                    name: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  }))}
                  margin={{ top: 4, right: 0, bottom: 0, left: -24 }}
                >
                  <XAxis dataKey="name" tick={{ fill: '#e8e4d930', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#e8e4d930', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#2d4a2d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    itemStyle={{ color: '#c8a96e', fontFamily: 'DM Mono', fontSize: 12 }}
                  />
                  <Bar dataKey="score" fill="#c8a96e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        )}

        {!completedRounds.length && (
          <p className="font-ui text-chalk/30 text-sm text-center py-8">
            Complete some rounds to unlock your stats
          </p>
        )}
      </div>
    </SafeArea>
  )
}
