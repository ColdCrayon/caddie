import { useState, useEffect } from 'react'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { CLUBS, CLUB_LABELS, type Club, type Lie } from '../../types'
import { getCurrentPosition } from '../../lib/gps'
import { streamAIAdvice } from '../../lib/claude'
import { fetchWeather, windDirectionLabel } from '../../lib/weather'

interface ShotLoggerProps {
  open: boolean
  onClose: () => void
  holePar: number
  holeNumber: number
  courseLat?: number
  courseLng?: number
}

const LIES: { value: Lie; label: string }[] = [
  { value: 'fairway', label: 'Fairway' },
  { value: 'rough', label: 'Rough' },
  { value: 'sand', label: 'Sand' },
  { value: 'trees', label: 'Trees' },
  { value: 'fringe', label: 'Fringe' },
  { value: 'green', label: 'Green' },
]

export function ShotLogger({ open, onClose, holePar, holeNumber, courseLat, courseLng }: ShotLoggerProps) {
  const [lie, setLie] = useState<Lie>('fairway')
  const [club, setClub] = useState<Club>('7i')
  const [distance, setDistance] = useState('')
  const [elevation, setElevation] = useState('')
  const [windSpeed, setWindSpeed] = useState('')
  const [windDir, setWindDir] = useState('')
  const [aiAdvice, setAiAdvice] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)

  useEffect(() => {
    if (open && courseLat && courseLng) {
      fetchWeather(courseLat, courseLng)
        .then((w) => {
          setWindSpeed(String(Math.round(w.current.wind_speed)))
          setWindDir(String(w.current.wind_direction))
        })
        .catch(() => {})
    }
  }, [open, courseLat, courseLng])

  const captureGPS = async () => {
    setGpsLoading(true)
    try {
      await getCurrentPosition()
    } catch {}
    setGpsLoading(false)
  }

  const getAdvice = async () => {
    if (!distance) return
    setAiAdvice('')
    setIsStreaming(true)
    try {
      await streamAIAdvice(
        {
          distance_to_pin: Number(distance),
          lie,
          wind_speed: Number(windSpeed) || 0,
          wind_direction: Number(windDir) || 0,
          elevation_change: Number(elevation) || 0,
          hole_par: holePar,
          hole_number: holeNumber,
          selected_club: club,
        },
        (chunk) => setAiAdvice((prev) => prev + chunk)
      )
    } catch {
      setAiAdvice('Angus is off the grid. Check your connection.')
    }
    setIsStreaming(false)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={`Shot Logger — Hole ${holeNumber}`}>
      <div className="px-5 pb-8 space-y-5">
        {/* Lie */}
        <div>
          <p className="font-ui text-chalk/50 text-xs uppercase tracking-widest mb-2">Lie</p>
          <div className="flex flex-wrap gap-2">
            {LIES.map((l) => (
              <button
                key={l.value}
                onClick={() => setLie(l.value)}
                className={`px-3 py-2 rounded-lg border font-ui text-sm transition-colors
                  ${lie === l.value
                    ? 'bg-sand/20 border-sand/50 text-sand'
                    : 'bg-rough/50 border-white/10 text-chalk/50'}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Distance */}
        <div>
          <p className="font-ui text-chalk/50 text-xs uppercase tracking-widest mb-2">Distance to Pin (yds)</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="150"
              className="flex-1 bg-ink border border-white/10 rounded-xl px-4 py-3 font-mono text-chalk text-xl
                         focus:outline-none focus:border-sand/50"
            />
            <button
              onClick={captureGPS}
              disabled={gpsLoading}
              className="px-4 py-3 bg-rough border border-white/10 rounded-xl text-chalk/60 font-ui text-sm"
            >
              {gpsLoading ? '…' : '📍 GPS'}
            </button>
          </div>
        </div>

        {/* Wind */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="font-ui text-chalk/50 text-xs uppercase tracking-widest mb-2">Wind (mph)</p>
            <input
              type="number"
              value={windSpeed}
              onChange={(e) => setWindSpeed(e.target.value)}
              placeholder="0"
              className="w-full bg-ink border border-white/10 rounded-xl px-4 py-3 font-mono text-chalk text-lg
                         focus:outline-none focus:border-sand/50"
            />
          </div>
          <div>
            <p className="font-ui text-chalk/50 text-xs uppercase tracking-widest mb-2">
              Wind Dir {windDir ? `(${windDirectionLabel(Number(windDir))})` : ''}
            </p>
            <input
              type="number"
              value={windDir}
              onChange={(e) => setWindDir(e.target.value)}
              placeholder="0°"
              className="w-full bg-ink border border-white/10 rounded-xl px-4 py-3 font-mono text-chalk text-lg
                         focus:outline-none focus:border-sand/50"
            />
          </div>
        </div>

        {/* Elevation */}
        <div>
          <p className="font-ui text-chalk/50 text-xs uppercase tracking-widest mb-2">Elevation (ft, +/-)</p>
          <input
            type="number"
            value={elevation}
            onChange={(e) => setElevation(e.target.value)}
            placeholder="0"
            className="w-full bg-ink border border-white/10 rounded-xl px-4 py-3 font-mono text-chalk text-lg
                       focus:outline-none focus:border-sand/50"
          />
        </div>

        {/* Club */}
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
                {CLUB_LABELS[c].replace(' ', '\n')}
              </button>
            ))}
          </div>
        </div>

        {/* AI Caddie */}
        <Button
          onClick={getAdvice}
          disabled={isStreaming || !distance}
          className="w-full"
        >
          {isStreaming ? '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Angus is thinking…' : '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Ask Angus'}
        </Button>

        {(aiAdvice || isStreaming) && (
          <div className="bg-ink/60 border border-sand/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🏴󠁧󠁢󠁳󠁣󠁴󠁿</span>
              <span className="font-ui text-sand text-xs uppercase tracking-widest">Angus says</span>
            </div>
            <p className="font-display text-chalk text-base leading-relaxed">
              {aiAdvice}
              {isStreaming && (
                <span className="inline-block w-1 h-4 bg-sand ml-1 animate-pulse" />
              )}
            </p>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
