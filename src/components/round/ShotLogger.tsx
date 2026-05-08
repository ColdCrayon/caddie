import { useState, useEffect } from 'react'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { CLUBS, CLUB_LABELS, type Club, type Lie } from '../../types'
import { getCurrentPosition, distanceBetween } from '../../lib/gps'
import { streamAIAdvice } from '../../lib/claude'
import { fetchWeather, windDirectionLabel } from '../../lib/weather'
import { useRoundStore } from '../../stores/roundStore'

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
  { value: 'rough',   label: 'Rough' },
  { value: 'sand',    label: 'Bunker' },
  { value: 'trees',   label: 'Trees' },
  { value: 'fringe',  label: 'Fringe' },
  { value: 'green',   label: 'Green' },
]

// GPS icon
const GpsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
  </svg>
)

export function ShotLogger({ open, onClose, holePar, holeNumber, courseLat, courseLng }: ShotLoggerProps) {
  const [lie, setLie] = useState<Lie>('fairway')
  const [club, setClub] = useState<Club>('7i')
  const [distance, setDistance] = useState('')
  const [aiAdvice, setAiAdvice] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState('')

  // Auto-detected conditions
  const [windSpeed, setWindSpeed] = useState<number | null>(null)
  const [windDir, setWindDir] = useState<number | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      setAiAdvice('')
      setGpsError('')
      autoFillDistance()
      autoFetchWeather()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const autoFetchWeather = async () => {
    const lat = courseLat
    const lng = courseLng
    if (!lat || !lng) return
    setWeatherLoading(true)
    try {
      const w = await fetchWeather(lat, lng)
      setWindSpeed(Math.round(w.current.wind_speed))
      setWindDir(w.current.wind_direction)
    } catch {}
    setWeatherLoading(false)
  }

  const autoFillDistance = async () => {
    // Try to compute distance from current GPS to the pin set on the map
    const state = useRoundStore.getState()
    const currentIdx = state.activeRound?.currentHoleIndex ?? 0
    const pin = state.activeRound?.holes[currentIdx]
    if (!pin?.pinLat || !pin?.pinLng) return

    setGpsLoading(true)
    setGpsError('')
    try {
      const pos = await getCurrentPosition()
      const yards = distanceBetween(pos.lat, pos.lng, pin.pinLat, pin.pinLng)
      setDistance(String(yards))
    } catch {
      // silently skip — user can enter manually
    }
    setGpsLoading(false)
  }

  const handleGpsButton = async () => {
    const state = useRoundStore.getState()
    const currentIdx = state.activeRound?.currentHoleIndex ?? 0
    const pin = state.activeRound?.holes[currentIdx]

    setGpsLoading(true)
    setGpsError('')
    try {
      const pos = await getCurrentPosition()
      if (pin?.pinLat && pin?.pinLng) {
        const yards = distanceBetween(pos.lat, pos.lng, pin.pinLat, pin.pinLng)
        setDistance(String(yards))
      } else {
        setGpsError('No pin set — tap "Set Target" on the GPS view first')
      }
    } catch (e) {
      setGpsError('GPS unavailable. Check location permissions.')
    }
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
          wind_speed: windSpeed ?? 0,
          wind_direction: windDir ?? 0,
          elevation_change: 0,
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

  const windLabel = windDir != null
    ? `${Math.round(windSpeed ?? 0)} mph ${windDirectionLabel(windDir)}`
    : null

  return (
    <BottomSheet open={open} onClose={onClose} title={`Hole ${holeNumber} — Shot Advisor`}>
      <div className="px-5 pb-8 space-y-5">

        {/* Distance to pin */}
        <div>
          <p className="font-ui text-fog text-xs uppercase tracking-widest mb-2">Distance to Pin</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="e.g. 150"
              className="flex-1 rounded-lg px-4 py-3 font-display text-chalk text-2xl
                         focus:outline-none focus:border-sand/50"
              style={{ background: 'rgba(14,22,14,0.8)', border: '1px solid rgba(255,255,255,0.10)' }}
            />
            <button
              onClick={handleGpsButton}
              disabled={gpsLoading}
              className="flex items-center gap-1.5 px-4 py-3 rounded-lg font-ui text-xs font-semibold
                         uppercase tracking-wider transition-all active:scale-[0.96] cursor-pointer"
              style={{
                background: 'rgba(201,169,110,0.12)',
                border: '1px solid rgba(201,169,110,0.3)',
                color: '#C9A96E',
                minWidth: 80,
              }}
            >
              {gpsLoading
                ? <span className="w-3 h-3 border border-sand border-t-transparent rounded-full animate-spin" />
                : <GpsIcon />
              }
              {gpsLoading ? '' : 'GPS'}
            </button>
          </div>
          {gpsError && (
            <p className="font-ui text-bogey text-xs mt-1.5">{gpsError}</p>
          )}
          {!gpsError && !distance && (
            <p className="font-ui text-fog/50 text-xs mt-1.5">
              Enter yardage or tap GPS to measure from your position to the pin
            </p>
          )}
        </div>

        {/* Lie */}
        <div>
          <p className="font-ui text-fog text-xs uppercase tracking-widest mb-2">Where's your ball?</p>
          <div className="flex flex-wrap gap-2">
            {LIES.map((l) => (
              <button
                key={l.value}
                onClick={() => setLie(l.value)}
                className="px-3 py-2 rounded-lg font-ui text-sm transition-all active:scale-[0.96] cursor-pointer"
                style={{
                  border: lie === l.value ? '1px solid rgba(201,169,110,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  background: lie === l.value ? 'rgba(201,169,110,0.15)' : 'rgba(22,31,22,0.8)',
                  color: lie === l.value ? '#C9A96E' : 'rgba(237,233,223,0.5)',
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Club */}
        <div>
          <p className="font-ui text-fog text-xs uppercase tracking-widest mb-2">Club</p>
          <div className="grid grid-cols-5 gap-1.5">
            {CLUBS.filter(c => c !== 'putter').map((c) => (
              <button
                key={c}
                onClick={() => setClub(c)}
                className="py-2 rounded-lg font-ui text-xs transition-all active:scale-[0.96] cursor-pointer"
                style={{
                  border: club === c ? '1px solid rgba(201,169,110,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  background: club === c ? 'rgba(201,169,110,0.15)' : 'rgba(22,31,22,0.8)',
                  color: club === c ? '#C9A96E' : 'rgba(237,233,223,0.5)',
                }}
              >
                {CLUB_LABELS[c].replace(' ', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-detected conditions */}
        <div
          className="rounded-lg px-4 py-3"
          style={{ background: 'rgba(14,22,14,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="font-ui text-fog text-xs uppercase tracking-widest mb-2">
            Conditions
            {weatherLoading && (
              <span className="ml-2 inline-block w-3 h-3 border border-fog border-t-transparent rounded-full animate-spin align-middle" />
            )}
          </p>
          {windLabel ? (
            <div className="flex items-center gap-2">
              <span className="font-display text-chalk text-lg">{windLabel}</span>
              <span className="font-ui text-fog/50 text-xs">auto-detected</span>
            </div>
          ) : !weatherLoading ? (
            <p className="font-ui text-fog/40 text-xs">
              Wind data unavailable — Angus will still give advice based on your distance and lie
            </p>
          ) : null}
        </div>

        {/* Ask Angus CTA */}
        <div>
          <Button
            onClick={getAdvice}
            disabled={isStreaming || !distance}
            className="w-full"
          >
            {isStreaming ? 'Angus is thinking…' : 'Ask Angus for club advice'}
          </Button>
          {!distance && (
            <p className="font-ui text-fog/40 text-xs text-center mt-2">
              Enter a distance above first
            </p>
          )}
        </div>

        {/* Streaming advice */}
        {(aiAdvice || isStreaming) && (
          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(22,31,22,0.8)', border: '1px solid rgba(201,169,110,0.15)' }}
          >
            <p className="font-ui text-sand text-xs uppercase tracking-widest mb-2">Angus says</p>
            <p className="font-ui text-chalk text-sm leading-relaxed">
              {aiAdvice}
              {isStreaming && (
                <span className="inline-block w-0.5 h-4 bg-sand ml-0.5 animate-pulse align-middle" />
              )}
            </p>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
