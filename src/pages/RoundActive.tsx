import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { HoleCard } from '../components/round/HoleCard'
import { ShotLogger } from '../components/round/ShotLogger'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useRoundStore } from '../stores/roundStore'
import { getScoreLabel } from '../lib/handicap'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/userStore'

export default function RoundActive() {
  const navigate = useNavigate()
  const user = useUserStore((s) => s.user)
  const { activeRound, isOffline, setCurrentHole, clearRound, getScoreToPar, getCompletedHoles } = useRoundStore()

  const [shotLoggerOpen, setShotLoggerOpen] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scoreToPar = getScoreToPar()
  const completedHoles = getCompletedHoles()
  const currentIdx = activeRound?.currentHoleIndex ?? 0

  // Swipe detection
  const touchStartX = useRef(0)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) < 50 || !activeRound) return
    const next = delta < 0
      ? Math.min(currentIdx + 1, 17)
      : Math.max(currentIdx - 1, 0)
    setCurrentHole(next)
    scrollRef.current?.scrollTo({ left: next * window.innerWidth, behavior: 'smooth' })
  }

  // Online/offline detection
  useEffect(() => {
    const { setOffline } = useRoundStore.getState()
    const handleOffline = () => setOffline(true)
    const handleOnline = () => setOffline(false)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  const finishRound = useCallback(async () => {
    if (!activeRound || !user) return
    setFinishing(true)
    try {
      const holes = activeRound.holes
      const totalScore = holes.reduce((t, h) => t + (h.strokes || 0), 0)

      // Save holes played
      const holesData = holes
        .filter((h) => h.strokes > 0)
        .map((h) => ({
          round_id: activeRound.roundId!,
          hole_number: h.holeNumber,
          par: h.par,
          yardage: h.yardage,
          strokes: h.strokes,
          putts: h.putts,
          fairway_hit: h.fairwayHit,
          gir: h.gir,
          sand_save: h.sandSave,
          score_label: getScoreLabel(h.strokes, h.par),
        }))

      await supabase.from('holes_played').insert(holesData)
      await supabase
        .from('rounds')
        .update({ total_score: totalScore, completed: true })
        .eq('id', activeRound.roundId!)

      clearRound()
      navigate(`/round/${activeRound.roundId}`)
    } catch (e) {
      console.error(e)
      setFinishing(false)
    }
  }, [activeRound, user, clearRound, navigate])

  if (!activeRound) {
    navigate('/round')
    return null
  }

  const currentHole = activeRound.holes[currentIdx]

  return (
    <div
      className="max-w-[430px] mx-auto min-h-screen bg-fairway overflow-hidden"
      style={{ overscrollBehavior: 'none' }}
    >
      {/* Sticky header */}
      <header
        className="sticky top-0 z-20 bg-fairway/95 backdrop-blur-xl border-b border-white/5 px-4 py-3"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-ui text-chalk/50 text-xs">{activeRound.courseName}</p>
            <p className="font-display text-chalk font-semibold text-sm">
              {completedHoles > 0
                ? `Through ${completedHoles} — ${scoreToPar === 0 ? 'E' : scoreToPar > 0 ? `+${scoreToPar}` : scoreToPar}`
                : 'Round in progress'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isOffline && <Badge variant="offline">Offline</Badge>}
            <button
              onClick={() => navigate('/round')}
              className="font-ui text-chalk/40 text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Hole dots */}
        <div className="flex gap-1 mt-2 overflow-x-auto pb-0.5">
          {activeRound.holes.map((h, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentHole(i)
                scrollRef.current?.scrollTo({ left: i * scrollRef.current.offsetWidth, behavior: 'smooth' })
              }}
              className={`flex-shrink-0 h-1.5 rounded-full transition-all ${
                i === currentIdx
                  ? 'w-6 bg-sand'
                  : h.strokes > 0
                  ? 'w-2 bg-chalk/40'
                  : 'w-2 bg-white/10'
              }`}
            />
          ))}
        </div>
      </header>

      {/* Swipeable hole cards */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', paddingBottom: 'calc(140px + env(safe-area-inset-bottom))' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {activeRound.holes.map((hole, i) => (
          <div key={i} className="w-full flex-shrink-0 snap-start py-4">
            <HoleCard hole={hole} index={i} teeColor={activeRound.teeColor} />
          </div>
        ))}
      </div>

      {/* Bottom controls */}
      <div
        className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-30 bg-ink/95 backdrop-blur-xl
                   border-t border-white/10 px-4 py-3 space-y-2"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <Button
          onClick={() => setShotLoggerOpen(true)}
          variant="secondary"
          className="w-full"
        >
          📍 Log Shot
        </Button>
        {completedHoles >= 9 && (
          <Button
            onClick={finishRound}
            disabled={finishing}
            className="w-full"
          >
            {finishing ? 'Saving round…' : 'Finish Round →'}
          </Button>
        )}
      </div>

      <ShotLogger
        open={shotLoggerOpen}
        onClose={() => setShotLoggerOpen(false)}
        holePar={currentHole.par}
        holeNumber={currentHole.holeNumber}
      />
    </div>
  )
}
