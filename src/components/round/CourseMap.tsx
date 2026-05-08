import { useEffect, useRef, useState, useCallback } from 'react'
import { setOptions } from '@googlemaps/js-api-loader'
import type { ActiveHoleState, TeeColor, Lie, Club } from '../../types'
import { CLUB_LABELS, CLUBS } from '../../types'
import { streamAIRequest } from '../../lib/claude'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined
const LIES: Lie[] = ['fairway', 'rough', 'sand', 'trees', 'fringe', 'green']
const LIE_LABELS: Record<Lie, string> = {
  fairway: 'Fairway', rough: 'Rough', sand: 'Sand',
  trees: 'Trees', fringe: 'Fringe', green: 'Green',
}

function haversineYards(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  const meters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return meters * 1.09361
}

interface Props {
  hole: ActiveHoleState
  teeColor: TeeColor
  courseLat: number | null
  courseLng: number | null
  onClose: () => void
  onPinSet?: (lat: number, lng: number) => void
}

export function CourseMap({ hole, teeColor: _teeColor, courseLat, courseLng, onClose, onPinSet }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const targetMarkerRef = useRef<any>(null)
  const watchIdRef = useRef<number | null>(null)

  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)
  const [target, setTarget] = useState<{ lat: number; lng: number } | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)

  const [selectedLie, setSelectedLie] = useState<Lie>('fairway')
  const [selectedClub, setSelectedClub] = useState<Club | ''>('')
  const [showClubPicker, setShowClubPicker] = useState(false)

  const [advice, setAdvice] = useState('')
  const [adviceLoading, setAdviceLoading] = useState(false)
  const [windSpeed, setWindSpeed] = useState(0)
  const [windDir, setWindDir] = useState(0)

  // Fetch live wind at course location
  useEffect(() => {
    const lat = courseLat ?? userPos?.lat
    const lng = courseLng ?? userPos?.lng
    if (!lat || !lng) return
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=mph`
    )
      .then((r) => r.json())
      .then((d) => {
        setWindSpeed(d.current?.wind_speed_10m ?? 0)
        setWindDir(d.current?.wind_direction_10m ?? 0)
      })
      .catch(() => {})
  }, [courseLat, courseLng, userPos])

  // Recalculate distance when either position changes
  useEffect(() => {
    if (userPos && target) {
      setDistance(haversineYards(userPos.lat, userPos.lng, target.lat, target.lng))
    } else {
      setDistance(null)
    }
  }, [userPos, target])

  // Update user marker when position changes
  useEffect(() => {
    if (!mapInstanceRef.current || !userPos) return
    if (userMarkerRef.current) {
      userMarkerRef.current.position = userPos
    }
  }, [userPos])

  // Update target marker when target changes
  useEffect(() => {
    if (!mapInstanceRef.current || !target) return
    if (targetMarkerRef.current) {
      targetMarkerRef.current.position = target
    }
  }, [target])

  const initMap = useCallback(async () => {
    if (!mapRef.current || !GOOGLE_MAPS_KEY) return

    setOptions({ key: GOOGLE_MAPS_KEY, v: 'weekly' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { importLibrary } = await import('@googlemaps/js-api-loader') as any

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { Map } = await importLibrary('maps') as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { AdvancedMarkerElement } = await importLibrary('marker') as any

    const center = { lat: courseLat ?? 37.09024, lng: courseLng ?? -95.71289 }

    const map = new Map(mapRef.current, {
      center,
      zoom: courseLat ? 17 : 4,
      mapTypeId: 'satellite',
      tilt: 0,
      disableDefaultUI: true,
      gestureHandling: 'greedy',
      mapId: 'DEMO_MAP_ID',
    })
    mapInstanceRef.current = map

    // User position marker (blue pulsing dot)
    const userDot = document.createElement('div')
    userDot.style.cssText = `
      width:16px;height:16px;border-radius:50%;background:#4285F4;
      border:3px solid white;box-shadow:0 0 0 4px rgba(66,133,244,0.3);
    `
    const userMarker = new AdvancedMarkerElement({ map, position: center, content: userDot })
    userMarkerRef.current = userMarker

    // Tap → place target flag
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.addListener('click', (e: any) => {
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      setTarget(pos)
      onPinSet?.(pos.lat, pos.lng)

      if (targetMarkerRef.current) {
        targetMarkerRef.current.map = null
      }
      const flagEl = document.createElement('div')
      flagEl.style.cssText = 'font-size:28px;line-height:1;cursor:pointer;'
      flagEl.textContent = '🚩'
      const flagMarker = new AdvancedMarkerElement({ map, position: pos, content: flagEl })
      targetMarkerRef.current = flagMarker
    })

    setMapReady(true)

    // Start GPS tracking
    if (!navigator.geolocation) {
      setGpsError('Geolocation not available on this device')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserPos(p)
        if (userMarkerRef.current) userMarkerRef.current.position = p
        // Pan to user on first fix
        setUserPos((prev) => {
          if (!prev) map.panTo(p)
          return p
        })
      },
      (err) => setGpsError(err.message),
      { enableHighAccuracy: true, maximumAge: 3000 }
    )
  }, [courseLat, courseLng, onPinSet])

  useEffect(() => {
    initMap()
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [initMap])

  const getAdvice = async () => {
    if (!distance) return
    setAdvice('')
    setAdviceLoading(true)
    const dirLabels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    const windLabel = dirLabels[Math.round(windDir / 45) % 8]
    try {
      await streamAIRequest(
        'shot_advice',
        {
          distance_to_pin: Math.round(distance),
          lie: selectedLie,
          wind_speed: Math.round(windSpeed),
          wind_direction: windDir,
          elevation_change: 0,
          hole_par: hole.par,
          hole_number: hole.holeNumber,
          selected_club: selectedClub || `none — wind ${Math.round(windSpeed)} mph from ${windLabel}, recommend a club`,
        },
        (chunk) => setAdvice((prev) => prev + chunk)
      )
    } catch {
      setAdvice('Could not reach Angus right now. Check your connection.')
    }
    setAdviceLoading(false)
  }

  const windDirLabel = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(windDir / 45) % 8]

  return (
    <div className="fixed inset-0 z-50 bg-ink flex flex-col max-w-[430px] mx-auto">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-fairway/95 border-b border-white/10"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      >
        <div>
          <p className="font-ui text-chalk/50 text-xs">Satellite View</p>
          <p className="font-display text-chalk font-semibold text-sm">
            Hole {hole.holeNumber} · Par {hole.par} · {hole.yardage} yds
          </p>
        </div>
        <div className="flex items-center gap-3">
          {windSpeed > 0 && (
            <span className="font-mono text-sand text-xs">
              {Math.round(windSpeed)} mph {windDirLabel}
            </span>
          )}
          <button onClick={onClose} className="text-chalk/50 text-2xl leading-none">✕</button>
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1 min-h-0">
        <div ref={mapRef} className="w-full h-full" />

        {!mapReady && (
          <div className="absolute inset-0 bg-ink flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-sand border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Distance badge */}
        {distance !== null && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-ink/90 backdrop-blur rounded-full px-4 py-1.5 border border-sand/30">
            <span className="font-mono text-sand font-bold text-lg">{Math.round(distance)}</span>
            <span className="font-ui text-chalk/60 text-sm ml-1">yds to flag</span>
          </div>
        )}

        {!target && mapReady && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-ink/80 backdrop-blur rounded-full px-4 py-2">
            <p className="font-ui text-chalk/70 text-xs">Tap map to place flag 🚩</p>
          </div>
        )}

        {gpsError && (
          <div className="absolute top-3 left-3 right-3 bg-bogey/20 border border-bogey/40 rounded-xl px-3 py-2">
            <p className="font-ui text-bogey text-xs">GPS: {gpsError}</p>
          </div>
        )}
      </div>

      {/* Controls panel */}
      <div
        className="bg-ink border-t border-white/10 px-4 pt-3 pb-4 space-y-3"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        {/* Lie selector */}
        <div>
          <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest mb-2">Lie</p>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {LIES.map((lie) => (
              <button
                key={lie}
                onClick={() => setSelectedLie(lie)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg border font-ui text-xs font-medium transition-colors ${
                  selectedLie === lie
                    ? 'bg-sand/20 border-sand/50 text-sand'
                    : 'bg-rough/30 border-white/10 text-chalk/50'
                }`}
              >
                {LIE_LABELS[lie]}
              </button>
            ))}
          </div>
        </div>

        {/* Club selector (optional) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest">Club (optional)</p>
            {selectedClub && (
              <button onClick={() => setSelectedClub('')} className="font-ui text-chalk/30 text-xs">
                Clear
              </button>
            )}
          </div>
          <button
            onClick={() => setShowClubPicker((v) => !v)}
            className="w-full text-left px-3 py-2 rounded-lg border border-white/10 bg-rough/30 font-ui text-sm"
          >
            <span className={selectedClub ? 'text-chalk' : 'text-chalk/30'}>
              {selectedClub ? CLUB_LABELS[selectedClub as Club] : 'Let Angus decide…'}
            </span>
          </button>
          {showClubPicker && (
            <div className="mt-1 bg-rough border border-white/10 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
              {CLUBS.filter((c) => c !== 'putter').map((c) => (
                <button
                  key={c}
                  onClick={() => { setSelectedClub(c); setShowClubPicker(false) }}
                  className="w-full text-left px-4 py-2 font-ui text-sm text-chalk hover:bg-sand/10 border-b border-white/5 last:border-0"
                >
                  {CLUB_LABELS[c]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ask Angus */}
        <button
          onClick={getAdvice}
          disabled={!distance || adviceLoading}
          className={`w-full py-3 rounded-xl font-ui font-semibold text-sm transition-colors ${
            distance && !adviceLoading
              ? 'bg-sand text-ink'
              : 'bg-rough border border-white/10 text-chalk/30'
          }`}
        >
          {adviceLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
              Angus is thinking…
            </span>
          ) : distance
            ? `Ask Angus — ${Math.round(distance)} yds`
            : 'Place flag first'}
        </button>

        {/* Streaming advice */}
        {advice && (
          <div className="bg-fairway/60 rounded-xl p-3 border border-white/5">
            <p className="font-ui text-chalk/50 text-xs mb-1">Angus</p>
            <p className="font-ui text-chalk text-sm leading-relaxed">{advice}</p>
          </div>
        )}
      </div>
    </div>
  )
}
