import { useEffect, useRef, useState } from 'react'
import { PoseLandmarker, DrawingUtils, type NormalizedLandmark } from '@mediapipe/tasks-vision'
import type { SwingAnalysis } from '../../types'
import type { PhaseData, PhaseName } from '../../lib/poseAnalysis'
import { Card } from '../ui/Card'

interface SwingFeedbackProps {
  analysis: SwingAnalysis
  phases: PhaseData
  lowConfidence: boolean
}

const PHASES: { key: PhaseName; label: string }[] = [
  { key: 'address', label: 'Address' },
  { key: 'takeaway', label: 'Takeaway' },
  { key: 'halfBackswing', label: 'Half Backswing' },
  { key: 'top', label: 'Top' },
  { key: 'downswing', label: 'Downswing' },
  { key: 'impact', label: 'Impact' },
  { key: 'followThrough', label: 'Follow-Through' },
]

const STATUS_COLOR = {
  good: 'text-birdie',
  watch: 'text-sand',
  fix: 'text-bogey',
} as const

const STATUS_DOT = {
  good: 'bg-birdie',
  watch: 'bg-sand',
  fix: 'bg-bogey',
} as const

const STATUS_ICON = {
  good: '✓',
  watch: '~',
  fix: '✕',
} as const

export function SwingFeedback({ analysis, phases, lowConfidence }: SwingFeedbackProps) {
  const [selectedIdx, setSelectedIdx] = useState(3) // default to Top
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const selectedPhase = PHASES[selectedIdx]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const phaseFrame = phases[selectedPhase.key]
    if (!phaseFrame) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      canvas.width = img.naturalWidth || 640
      canvas.height = img.naturalHeight || 360
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      try {
        const landmarks = phaseFrame.landmarks as unknown as NormalizedLandmark[]
        const drawingUtils = new DrawingUtils(ctx)
        drawingUtils.drawConnectors(
          landmarks,
          PoseLandmarker.POSE_CONNECTIONS,
          { color: '#22c55e99', lineWidth: 2 }
        )
        drawingUtils.drawLandmarks(landmarks, {
          color: '#f59e0b',
          fillColor: '#f59e0bcc',
          radius: 3,
        })
      } catch {
        // DrawingUtils failed silently — still shows the frame image
      }
    }
    img.src = `data:image/jpeg;base64,${phaseFrame.image}`
  }, [selectedIdx, phases, selectedPhase.key])

  const tips = analysis.tips
    ? [...analysis.tips].sort((a, b) => {
        const pa = typeof a === 'object' ? (a as { priority: number }).priority : 0
        const pb = typeof b === 'object' ? (b as { priority: number }).priority : 0
        return pa - pb
      })
    : []

  return (
    <div className="space-y-4">
      {/* Confidence warning */}
      {lowConfidence && (
        <div className="px-4 py-3 rounded-xl bg-bogey/10 border border-bogey/30">
          <p className="font-ui text-bogey/80 text-xs leading-relaxed">
            Pose detection was uncertain on some frames — results may be less accurate. Try recording in better light with your full body in frame.
          </p>
        </div>
      )}

      {/* Skeleton overlay canvas */}
      <div className="relative rounded-2xl overflow-hidden bg-ink">
        <canvas ref={canvasRef} className="w-full" style={{ aspectRatio: '16/9' }} />
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-ink/80 to-transparent">
          <p className="font-ui text-chalk/80 text-xs font-medium">{selectedPhase.label}</p>
        </div>
      </div>

      {/* Phase thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PHASES.map((phase, i) => {
          const frame = phases[phase.key]
          return (
            <button
              key={phase.key}
              onClick={() => setSelectedIdx(i)}
              className={`flex-shrink-0 rounded-xl overflow-hidden border-2 transition-colors
                ${selectedIdx === i ? 'border-sand' : 'border-transparent opacity-60'}`}
              style={{ width: 72 }}
            >
              {frame && (
                <img
                  src={`data:image/jpeg;base64,${frame.image}`}
                  alt={phase.label}
                  className="w-full"
                  style={{ aspectRatio: '16/9', objectFit: 'cover' }}
                />
              )}
              <p className="font-ui text-[8px] text-chalk/60 text-center py-1 bg-rough/80 leading-tight">
                {phase.label}
              </p>
            </button>
          )
        })}
      </div>

      {/* Summary */}
      <Card className="p-4">
        <h3 className="font-ui text-chalk/40 text-xs uppercase tracking-widest mb-2">Assessment</h3>
        <p className="font-ui text-chalk/80 text-sm leading-relaxed">
          {analysis.summary || analysis.overall}
        </p>
      </Card>

      {/* Metrics scorecard */}
      {analysis.metrics && analysis.metrics.length > 0 && (
        <Card className="p-4 space-y-2">
          <h3 className="font-ui text-chalk/40 text-xs uppercase tracking-widest mb-3">Biomechanics</h3>
          {analysis.metrics.map((metric, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
              <span className={`font-mono text-xs font-bold flex-shrink-0 mt-0.5 ${STATUS_COLOR[metric.status]}`}>
                {STATUS_ICON[metric.status]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-ui text-chalk text-xs font-medium">{metric.name}</p>
                <p className="font-ui text-chalk/40 text-xs leading-relaxed mt-0.5">{metric.note}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`font-mono text-sm font-bold ${STATUS_COLOR[metric.status]}`}>
                  {metric.value}
                </span>
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[metric.status]}`} />
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Coaching tips */}
      {tips.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="font-ui text-chalk/40 text-xs uppercase tracking-widest">Coaching Focus</h3>
          {tips.map((tip, i) => {
            const t = tip as { priority?: number; fault?: string; drill?: string }
            if (!t.fault) return null
            return (
              <div key={i} className="p-3 rounded-xl bg-rough/60 border border-white/5">
                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className="font-mono text-sand text-xs font-bold flex-shrink-0">{t.priority ?? i + 1}</span>
                  <p className="font-ui text-chalk text-sm font-medium leading-snug">{t.fault}</p>
                </div>
                {t.drill && (
                  <p className="font-ui text-chalk/50 text-xs leading-relaxed pl-4">
                    <span className="text-sand/70">Drill: </span>{t.drill}
                  </p>
                )}
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
