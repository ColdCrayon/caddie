import { useState } from 'react'
import type { SwingAnalysis } from '../../types'
import { Card } from '../ui/Card'

interface SwingFeedbackProps {
  analysis: SwingAnalysis
  frames: string[]
}

const POSITIONS = ['Address', 'Takeaway', 'Top', 'Impact', 'Follow-Through']

export function SwingFeedback({ analysis, frames }: SwingFeedbackProps) {
  const [selected, setSelected] = useState(0)

  return (
    <div className="space-y-4">
      {/* Frame strip */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {frames.map((frame, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`flex-shrink-0 w-20 rounded-xl overflow-hidden border-2 transition-colors
              ${selected === i ? 'border-sand' : 'border-transparent'}`}
          >
            <img
              src={`data:image/jpeg;base64,${frame}`}
              alt={POSITIONS[i]}
              className="w-full aspect-video object-cover"
            />
            <p className="font-ui text-[9px] text-chalk/60 text-center py-1 bg-rough/80">
              {POSITIONS[i]}
            </p>
          </button>
        ))}
      </div>

      {/* Selected frame detail */}
      {analysis.frames[selected] && (
        <Card className="p-4 space-y-3">
          <h3 className="font-display text-chalk font-semibold text-base">
            {POSITIONS[selected]}
          </h3>
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="text-birdie text-sm">✓</span>
              <p className="font-ui text-chalk/80 text-sm">{analysis.frames[selected].correct}</p>
            </div>
            <div className="flex gap-2">
              <span className="text-sand text-sm">→</span>
              <p className="font-ui text-chalk/80 text-sm">{analysis.frames[selected].improve}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Overall */}
      <Card className="p-4 space-y-3">
        <h3 className="font-display text-sand font-semibold text-base">Overall Assessment</h3>
        <p className="font-ui text-chalk/80 text-sm leading-relaxed">{analysis.overall}</p>
      </Card>

      {/* Tips */}
      <Card className="p-4 space-y-3">
        <h3 className="font-ui text-chalk/50 text-xs uppercase tracking-widest">Top 3 Tips</h3>
        <ol className="space-y-2.5">
          {analysis.tips.map((tip, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-sand text-sm font-bold flex-shrink-0">{i + 1}.</span>
              <p className="font-ui text-chalk/80 text-sm leading-relaxed">{tip}</p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}
