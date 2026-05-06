import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SafeArea } from '../components/layout/SafeArea'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { SkeletonCard } from '../components/ui/SkeletonLoader'
import { useUserStore } from '../stores/userStore'
import { useRounds } from '../hooks/useRound'
import { fetchWeeklyDigest } from '../lib/claude'
import { supabase } from '../lib/supabase'
import type { Digest, HolePlayed } from '../types'

export default function Insights() {
  const user = useUserStore((s) => s.user)
  const { data: rounds } = useRounds(user?.id)
  const [digest, setDigest] = useState<Digest | null>(null)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    supabase
      .from('digests')
      .select('*')
      .eq('user_id', user.id)
      .gte('generated_at', sevenDaysAgo)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setDigest(data as Digest)
        setLoading(false)
      })
  }, [user])

  const generateDigest = async () => {
    if (!user || !rounds) return
    setGenerating(true)

    const last4 = rounds.filter((r) => r.completed).slice(0, 4)
    const statsData = last4.map((r) => {
      const holes: HolePlayed[] = (r.holes_played ?? []) as HolePlayed[]
      const gir = holes.filter((h) => h.gir).length
      const fir = holes.filter((h) => h.fairway_hit).length
      const putts = holes.reduce((t, h) => t + h.putts, 0)
      return {
        date: r.date,
        score: r.total_score,
        gir_pct: Math.round((gir / 18) * 100),
        fir_pct: Math.round((fir / 14) * 100),
        putts,
      }
    })

    try {
      const content = await fetchWeeklyDigest({ rounds: statsData })
      const { data } = await supabase
        .from('digests')
        .insert({ user_id: user.id, content, generated_at: new Date().toISOString() })
        .select()
        .single()
      if (data) setDigest(data as Digest)
    } catch (e) {
      console.error(e)
    }
    setGenerating(false)
  }

  const parseDigestSections = (content: string) => {
    const lines = content.split('\n').filter(Boolean)
    return lines
  }

  return (
    <SafeArea>
      <PageHeader title="AI Insights" subtitle="Your weekly coaching digest" />
      <div className="px-4 py-4 space-y-4">
        {loading && <SkeletonCard />}

        {!loading && !digest && !generating && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 text-center space-y-4">
              <div className="text-5xl">🧠</div>
              <p className="font-display text-chalk text-lg font-semibold">Weekly Digest</p>
              <p className="font-ui text-chalk/50 text-sm">
                Get a personalized coaching report based on your last 4 rounds. Generated fresh every 7 days.
              </p>
              <Button
                onClick={generateDigest}
                disabled={!rounds?.filter((r) => r.completed).length}
                className="w-full"
                size="lg"
              >
                Generate My Digest
              </Button>
              {!rounds?.filter((r) => r.completed).length && (
                <p className="font-ui text-chalk/30 text-xs">Complete at least one round first</p>
              )}
            </Card>
          </motion.div>
        )}

        {generating && (
          <div className="flex flex-col items-center py-16 space-y-4">
            <div className="w-12 h-12 border-2 border-sand border-t-transparent rounded-full animate-spin" />
            <p className="font-display text-chalk text-lg">Your coach is reviewing your game…</p>
          </div>
        )}

        {digest && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest">Weekly Report</p>
                  <p className="font-display text-sand font-semibold text-lg">
                    {new Date(digest.generated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <span className="text-3xl">🏌️</span>
              </div>

              {/* Decorative quote opener */}
              <div className="border-l-2 border-sand/40 pl-4">
                <span className="font-display text-sand/40 text-6xl leading-none select-none">"</span>
              </div>

              {/* Content */}
              <div className="space-y-3">
                {parseDigestSections(digest.content).map((line, i) => {
                  const isHeading = line.startsWith('##') || /^[A-Z\s]+:/.test(line)
                  const isListItem = line.startsWith('- ') || line.startsWith('• ') || /^\d+\./.test(line)

                  if (isHeading) {
                    return (
                      <h3 key={i} className="font-display text-sand font-semibold text-base mt-4 first:mt-0">
                        {line.replace(/^#+\s*/, '').replace(/:$/, '')}
                      </h3>
                    )
                  }

                  if (isListItem) {
                    return (
                      <div key={i} className="flex gap-2">
                        <span className="text-sand mt-0.5">•</span>
                        <p className="font-ui text-chalk/80 text-sm leading-relaxed flex-1">
                          {line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '')}
                        </p>
                      </div>
                    )
                  }

                  return (
                    <p key={i} className="font-ui text-chalk/80 text-sm leading-relaxed">
                      {line}
                    </p>
                  )
                })}
              </div>
            </Card>

            <Button
              variant="secondary"
              onClick={generateDigest}
              disabled={generating}
              className="w-full"
            >
              Regenerate Digest
            </Button>
          </motion.div>
        )}
      </div>
    </SafeArea>
  )
}
