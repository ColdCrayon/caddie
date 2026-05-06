import { useState } from 'react'
import { motion } from 'framer-motion'
import { SafeArea } from '../components/layout/SafeArea'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { CameraView } from '../components/swing/CameraView'
import { SwingFeedback } from '../components/swing/SwingFeedback'
import { useUserStore } from '../stores/userStore'
import { useSwings, useSaveSwing, useUploadSwingVideo } from '../hooks/useSwings'
import { extractFrames } from '../lib/canvas'
import { fetchSwingAnalysis } from '../lib/claude'
import type { Club, SwingAnalysis } from '../types'
import { CLUBS, CLUB_LABELS } from '../types'

type Stage = 'list' | 'record' | 'analyzing' | 'feedback'

export default function Swing() {
  const user = useUserStore((s) => s.user)
  const { data: swings } = useSwings(user?.id)
  const saveSwing = useSaveSwing()
  const uploadVideo = useUploadSwingVideo()

  const [stage, setStage] = useState<Stage>('list')
  const [club, setClub] = useState<Club>('7i')
  const [analysis, setAnalysis] = useState<SwingAnalysis | null>(null)
  const [frames, setFrames] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleRecorded = async (blob: Blob) => {
    setStage('analyzing')
    setError(null)
    try {
      const extracted = await extractFrames(blob, 5)
      setFrames(extracted)

      const raw = await fetchSwingAnalysis(extracted, club)
      const parsed: SwingAnalysis = JSON.parse(raw)
      setAnalysis(parsed)

      // Upload video + save to DB in background
      if (user) {
        uploadVideo.mutateAsync({ blob, userId: user.id }).then((videoUrl) => {
          saveSwing.mutate({
            user_id: user.id,
            video_url: videoUrl,
            club,
            date: new Date().toISOString(),
            ai_analysis: parsed,
            rating: 0,
            notes: '',
          })
        }).catch(() => {})
      }

      setStage('feedback')
    } catch (e) {
      setError('Analysis failed. Check your connection and try again.')
      setStage('record')
    }
  }

  return (
    <SafeArea>
      <PageHeader title="Swing Analyzer" subtitle="AI-powered coaching" />

      <div className="px-4 py-4 space-y-4">
        {stage === 'list' && (
          <>
            <Button onClick={() => setStage('record')} className="w-full" size="lg">
              🎥 Record New Swing
            </Button>

            {swings && swings.length > 0 && (
              <div>
                <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest mb-3">Swing Library</p>
                <div className="space-y-3">
                  {swings.map((s) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="p-4">
                        <div className="flex gap-3 items-start">
                          <div className="w-20 aspect-video bg-ink/60 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">🎥</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-ui text-chalk font-medium text-sm">{CLUB_LABELS[s.club]}</p>
                            <p className="font-ui text-chalk/40 text-xs">
                              {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                            {s.rating > 0 && (
                              <p className="font-ui text-eagle text-xs mt-1">{'★'.repeat(s.rating)}</p>
                            )}
                          </div>
                        </div>
                        {s.ai_analysis && (
                          <p className="font-ui text-chalk/50 text-xs mt-2 line-clamp-2">
                            {s.ai_analysis.overall}
                          </p>
                        )}
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {!swings?.length && (
              <p className="font-ui text-chalk/30 text-sm text-center py-8">
                Record your first swing to get AI coaching
              </p>
            )}
          </>
        )}

        {stage === 'record' && (
          <div className="space-y-4">
            <div>
              <p className="font-ui text-chalk/50 text-xs uppercase tracking-widest mb-2">Club</p>
              <div className="grid grid-cols-4 gap-1.5">
                {CLUBS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setClub(c)}
                    className={`py-2 rounded-lg border font-ui text-xs transition-colors
                      ${club === c
                        ? 'bg-sand/20 border-sand/50 text-sand'
                        : 'bg-rough/50 border-white/10 text-chalk/50'}`}
                  >
                    {CLUB_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="font-ui text-bogey text-sm">{error}</p>}

            <CameraView onRecorded={handleRecorded} />

            <Button variant="ghost" onClick={() => setStage('list')} className="w-full">
              ← Back
            </Button>
          </div>
        )}

        {stage === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-2 border-sand border-t-transparent rounded-full animate-spin" />
            <p className="font-display text-chalk text-lg">Analyzing your swing…</p>
            <p className="font-ui text-chalk/40 text-sm text-center">
              Extracting frames and consulting the PGA teaching pro
            </p>
          </div>
        )}

        {stage === 'feedback' && analysis && (
          <div className="space-y-4">
            <SwingFeedback analysis={analysis} frames={frames} />
            <Button
              variant="secondary"
              onClick={() => { setStage('list'); setAnalysis(null); setFrames([]) }}
              className="w-full"
            >
              ← Swing Library
            </Button>
          </div>
        )}
      </div>
    </SafeArea>
  )
}
