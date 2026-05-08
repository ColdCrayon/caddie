import { useRef, useState, useEffect, useCallback, useLayoutEffect } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { HoleCard } from '../components/round/HoleCard'
import { CourseMap } from '../components/round/CourseMap'
import { DistanceDisplay } from '../components/round/DistanceDisplay'
import { ShotLogger } from '../components/round/ShotLogger'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useRoundStore } from '../stores/roundStore'
import { getScoreLabel } from '../lib/handicap'
import { watchPosition, clearWatch, getDistancesToGreen, type GreenDistances } from '../lib/gps'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/userStore'

// SVG icons
const MapIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
    <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
  </svg>
)
const ShotIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
)
const ScorecardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="13" y2="15"/>
  </svg>
)
const GpsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
  </svg>
)

type View = 'gps' | 'scorecard'

export default function RoundActive() {
  const navigate = useNavigate()
  const user = useUserStore((s) => s.user)
  const { activeRound, isOffline, setCurrentHole, clearRound, getScoreToPar, getCompletedHoles } = useRoundStore()

  const [view, setView] = useState<View>('gps')
  const [shotLoggerOpen, setShotLoggerOpen] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [distances, setDistances] = useState<GreenDistances | null>(null)
  const [gpsAccuracy, setGpsAccuracy] = useState<number | undefined>()
  const [gpsUpdating, setGpsUpdating] = useState(false)
  const [cardWidth, setCardWidth] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)
  const carouselX = useMotionValue(0)
  const watchIdRef = useRef<number>(-1)

  const scoreToPar = getScoreToPar()
  const completedHoles = getCompletedHoles()
  const currentIdx = activeRound?.currentHoleIndex ?? 0

  // GPS watch for distance display
  useEffect(() => {
    if (!activeRound) return

    watchIdRef.current = watchPosition(
      (pos) => {
        setGpsAccuracy(pos.accuracy)
        setGpsUpdating(true)
        const currentHole = useRoundStore.getState().activeRound?.holes[
          useRoundStore.getState().activeRound?.currentHoleIndex ?? 0
        ]
        if (currentHole?.pinLat && currentHole?.pinLng) {
          setDistances(
            getDistancesToGreen(pos.lat, pos.lng, { lat: currentHole.pinLat, lng: currentHole.pinLng })
          )
        }
        setTimeout(() => setGpsUpdating(false), 800)
      },
      () => { setGpsUpdating(false) }
    )

    return () => clearWatch(watchIdRef.current)
  }, [activeRound])

  // Recalculate distances when current hole pin changes
  const currentHole = activeRound?.holes[currentIdx]
  useEffect(() => {
    if (!currentHole?.pinLat || !currentHole?.pinLng) {
      setDistances(null)
    }
  }, [currentHole?.pinLat, currentHole?.pinLng])

  // Measure card width on mount and resize
  useLayoutEffect(() => {
    const measure = () => setCardWidth(carouselRef.current?.offsetWidth ?? Math.min(window.innerWidth, 430))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Snap carousel to current hole with spring animation
  useEffect(() => {
    if (cardWidth === 0) return
    animate(carouselX, -currentIdx * cardWidth, { type: 'spring', stiffness: 320, damping: 32 })
  }, [currentIdx, cardWidth, carouselX])

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

  const scoreLabel = scoreToPar === 0 ? 'E' : scoreToPar > 0 ? `+${scoreToPar}` : String(scoreToPar)

  return (
    <div
      className="max-w-[430px] mx-auto min-h-screen overflow-hidden round-screen"
      style={{ background: '#0E160E' }}
    >
      {/* Sticky header */}
      <header
        className="sticky top-0 z-20 border-b border-white/5 px-4 py-3"
        style={{
          background: 'rgba(22,31,22,0.97)',
          backdropFilter: 'blur(12px)',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-ui text-fog text-xs uppercase tracking-widest">{activeRound.courseName}</p>
            <p className="font-serif text-chalk text-base">
              {completedHoles > 0
                ? `Through ${completedHoles} · ${scoreLabel}`
                : 'Round in progress'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isOffline && <Badge variant="offline">Offline</Badge>}
            <button
              onClick={() => navigate('/round')}
              className="text-fog/60 text-xl leading-none cursor-pointer"
              aria-label="Exit round"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Hole dots progress */}
        <div className="flex gap-1 mt-2.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {activeRound.holes.map((h, i) => (
            <button
              key={i}
              onClick={() => setCurrentHole(i)}
              className="flex-shrink-0 h-1.5 rounded-full transition-all duration-200 cursor-pointer"
              style={{
                width: i === currentIdx ? 24 : 8,
                background: i === currentIdx
                  ? '#C9A96E'
                  : h.strokes > 0
                  ? 'rgba(237,233,223,0.35)'
                  : 'rgba(255,255,255,0.1)',
              }}
            />
          ))}
        </div>

        {/* View toggle */}
        <div
          className="flex mt-3 rounded-lg overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(14,22,14,0.6)' }}
        >
          {([
            { id: 'gps', icon: <GpsIcon />, label: 'GPS' },
            { id: 'scorecard', icon: <ScorecardIcon />, label: 'Card' },
          ] as const).map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 font-ui text-xs font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer"
              style={{
                background: view === id ? '#C9A96E' : 'transparent',
                color: view === id ? '#0E160E' : 'rgba(138,158,138,0.7)',
              }}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* GPS View */}
      {view === 'gps' && (
        <div className="px-4 pt-4 pb-4 space-y-3">
          {/* Distance display card */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at 30% 20%, #243824 0%, #1B2F1B 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <DistanceDisplay
              distances={distances}
              updating={gpsUpdating}
              accuracy={gpsAccuracy}
            />
          </div>

          {/* Current hole quick stats */}
          {currentHole && (
            <div
              className="rounded-xl px-5 py-4 flex justify-between items-center"
              style={{ background: 'radial-gradient(ellipse at 30% 20%, #243824 0%, #1B2F1B 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="text-center">
                <p className="font-ui text-fog text-xs uppercase tracking-widest mb-1">Hole</p>
                <p className="font-display text-sand" style={{ fontSize: 36, lineHeight: 1 }}>
                  {currentHole.holeNumber}
                </p>
              </div>
              <div className="text-center">
                <p className="font-ui text-fog text-xs uppercase tracking-widest mb-1">Par</p>
                <p className="font-display text-chalk text-2xl">{currentHole.par}</p>
              </div>
              <div className="text-center">
                <p className="font-ui text-fog text-xs uppercase tracking-widest mb-1">Strokes</p>
                <p className="font-display text-chalk text-2xl">{currentHole.strokes || '—'}</p>
              </div>
              <div className="text-center">
                <p className="font-ui text-fog text-xs uppercase tracking-widest mb-1">Yards</p>
                <p className="font-display text-chalk text-2xl">{currentHole.yardage}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scorecard View — Framer Motion spring carousel */}
      {view === 'scorecard' && (
        <div
          ref={carouselRef}
          className="overflow-hidden"
          style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom))' }}
        >
          <motion.div
            drag="x"
            style={{ x: carouselX, display: 'flex', willChange: 'transform' }}
            dragConstraints={{
              left: cardWidth > 0 ? -(17 * cardWidth) : 0,
              right: 0,
            }}
            dragElastic={0.08}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              const vel = info.velocity.x
              const off = info.offset.x
              let next = currentIdx
              if (vel < -300 || off < -(cardWidth / 3)) next = Math.min(currentIdx + 1, 17)
              else if (vel > 300 || off > cardWidth / 3)  next = Math.max(currentIdx - 1, 0)
              setCurrentHole(next)
            }}
          >
            {activeRound.holes.map((hole, i) => (
              <div key={i} style={{ width: cardWidth, flexShrink: 0 }} className="py-4">
                <HoleCard hole={hole} index={i} teeColor={activeRound.teeColor} />
              </div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Bottom controls */}
      <div
        className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-30 border-t border-white/10 px-4 pt-3"
        style={{
          background: 'rgba(14,22,14,0.97)',
          backdropFilter: 'blur(12px)',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setMapOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded font-ui text-sm font-semibold uppercase tracking-wider transition-all active:scale-[0.96] cursor-pointer"
            style={{
              background: distances ? '#243824' : 'rgba(201,169,110,0.12)',
              border: distances ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(201,169,110,0.35)',
              color: distances ? '#EDE9DF' : '#C9A96E',
            }}
          >
            <MapIcon />
            {distances ? 'Satellite' : 'Set Target'}
          </button>
          <button
            onClick={() => setShotLoggerOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded font-ui text-sm font-semibold uppercase tracking-wider transition-all active:scale-[0.96] cursor-pointer"
            style={{ background: '#243824', border: '1px solid rgba(255,255,255,0.10)', color: '#EDE9DF' }}
          >
            <ShotIcon />
            Log Shot
          </button>
        </div>
        {completedHoles >= Math.ceil(activeRound.holes.length / 2) && (
          <Button
            onClick={finishRound}
            disabled={finishing}
            className="w-full"
          >
            {finishing ? 'Saving round…' : 'Finish Round'}
          </Button>
        )}
      </div>

      <ShotLogger
        open={shotLoggerOpen}
        onClose={() => setShotLoggerOpen(false)}
        holePar={currentHole?.par ?? 4}
        holeNumber={currentHole?.holeNumber ?? 1}
        courseLat={activeRound.courseLat ?? undefined}
        courseLng={activeRound.courseLng ?? undefined}
      />

      {mapOpen && (
        <CourseMap
          hole={currentHole!}
          teeColor={activeRound.teeColor}
          courseLat={activeRound.courseLat ?? null}
          courseLng={activeRound.courseLng ?? null}
          onClose={() => setMapOpen(false)}
          onPinSet={(lat, lng) => {
            useRoundStore.getState().updateHole(currentIdx, { pinLat: lat, pinLng: lng })
          }}
        />
      )}
    </div>
  )
}
