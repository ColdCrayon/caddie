import { useEffect, useRef, useState } from 'react'
import { setOptions } from '@googlemaps/js-api-loader'
import type { ActiveHoleState, TeeColor } from '../../types'
import { distanceBetween } from '../../lib/gps'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined

interface Props {
  hole: ActiveHoleState
  teeColor: TeeColor
  courseLat: number | null
  courseLng: number | null
  onClose: () => void
  onPinSet?: (lat: number, lng: number) => void
}

export function CourseMap({ hole, teeColor, courseLat, courseLng, onClose, onPinSet }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null)

  // Stable map handles — stored in refs so state changes don't reinit the map
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pinMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineRef = useRef<any>(null)
  const watchIdRef = useRef<number | null>(null)
  const firstGpsFix = useRef(false)
  const onPinSetRef = useRef(onPinSet)
  const [mapReady, setMapReady] = useState(false)

  // Display state (UI only — never used as effect deps that touch the map)
  const [playerPos, setPlayerPos] = useState<{ lat: number; lng: number } | null>(null)
  const [pinPos, setPinPos] = useState<{ lat: number; lng: number } | null>(null)
  const [distYards, setDistYards] = useState<number | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [windSpeed, setWindSpeed] = useState<number | null>(null)
  const [windLabel, setWindLabel] = useState<string>('')

  // Keep onPinSetRef current without triggering any effect
  useEffect(() => { onPinSetRef.current = onPinSet }, [onPinSet])

  // Fetch wind once on mount
  useEffect(() => {
    const lat = courseLat ?? null
    const lng = courseLng ?? null
    if (!lat || !lng) return
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=mph`)
      .then(r => r.json())
      .then(d => {
        const spd = Math.round(d.current?.wind_speed_10m ?? 0)
        const deg = d.current?.wind_direction_10m ?? 0
        const dirs = ['N','NE','E','SE','S','SW','W','NW']
        setWindSpeed(spd)
        setWindLabel(`${spd} mph ${dirs[Math.round(deg / 45) % 8]}`)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ONE-TIME map initialisation
  useEffect(() => {
    if (!mapDivRef.current || !GOOGLE_MAPS_KEY) return
    let cancelled = false

    async function init() {
      setOptions({ key: GOOGLE_MAPS_KEY!, v: 'weekly' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { importLibrary } = await import('@googlemaps/js-api-loader') as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { Map, Polyline } = await importLibrary('maps') as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { AdvancedMarkerElement } = await importLibrary('marker') as any
      if (cancelled || !mapDivRef.current) return

      const center = { lat: courseLat ?? 37.09024, lng: courseLng ?? -95.71289 }

      const map = new Map(mapDivRef.current, {
        center,
        zoom: courseLat ? 17 : 4,
        mapTypeId: 'satellite',
        tilt: 0,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        mapId: 'DEMO_MAP_ID',
      })
      mapRef.current = map

      // Player marker — pulsing blue dot
      const playerDot = document.createElement('div')
      playerDot.style.cssText = `
        width:16px;height:16px;border-radius:50%;
        background:#4A90E2;border:3px solid white;
        box-shadow:0 0 0 6px rgba(74,144,226,0.25);
      `
      playerMarkerRef.current = new AdvancedMarkerElement({
        map, position: center, content: playerDot,
      })

      // Polyline (initially invisible)
      const line = new Polyline({
        path: [],
        strokeColor: '#FFFFFF',
        strokeOpacity: 0.85,
        strokeWeight: 2,
        map,
        icons: [{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          icon: { path: (await importLibrary('maps') as any).SymbolPath?.FORWARD_CLOSED_ARROW ?? 0, scale: 3, strokeColor: '#C9A96E' },
          offset: '50%',
        }],
      })
      polylineRef.current = line

      // Tap map → place pin
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.addListener('click', (e: any) => {
        const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() }
        placePinAt(pos, { Map, AdvancedMarkerElement })
        onPinSetRef.current?.(pos.lat, pos.lng)
      })

      setMapReady(true)

      // GPS watch — stable, lives for the lifetime of this component
      if (!navigator.geolocation) {
        setGpsError('Geolocation not supported')
        return
      }
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (cancelled) return
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setPlayerPos(p)
          // Update player marker
          if (playerMarkerRef.current) playerMarkerRef.current.position = p
          // Pan on first fix only
          if (!firstGpsFix.current && mapRef.current) {
            mapRef.current.panTo(p)
            firstGpsFix.current = true
          }
          // Update polyline
          updatePolyline(p, pinMarkerRef.current?.position)
          // Update distance
          if (pinMarkerRef.current?.position) {
            const pin = pinMarkerRef.current.position
            setDistYards(distanceBetween(p.lat, p.lng, pin.lat, pin.lng))
          }
        },
        (err) => setGpsError(err.message),
        { enableHighAccuracy: true, maximumAge: 3000 }
      )
    }

    init().catch(console.error)
    return () => {
      cancelled = true
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // empty — init ONCE, use refs for everything dynamic

  function placePinAt(
    pos: { lat: number; lng: number },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    libs?: { Map?: any; AdvancedMarkerElement?: any }
  ) {
    // Remove old pin marker
    if (pinMarkerRef.current) pinMarkerRef.current.map = null

    const AME = libs?.AdvancedMarkerElement
    if (!AME || !mapRef.current) return

    const flagEl = document.createElement('div')
    flagEl.style.cssText = `
      width:28px;height:28px;display:flex;align-items:center;justify-content:center;
      font-size:22px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.6));
    `
    flagEl.textContent = '🚩'
    pinMarkerRef.current = new AME({ map: mapRef.current, position: pos, content: flagEl })
    setPinPos(pos)

    if (playerPos) {
      updatePolyline(playerPos, pos)
      setDistYards(distanceBetween(playerPos.lat, playerPos.lng, pos.lat, pos.lng))
    }
  }

  function updatePolyline(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number } | null | undefined
  ) {
    if (!polylineRef.current) return
    if (to) {
      polylineRef.current.setPath([from, to])
    } else {
      polylineRef.current.setPath([])
    }
  }

  const teeYardage = hole.yardage ?? '—'

  return (
    <div className="fixed inset-0 z-50 flex flex-col max-w-[430px] mx-auto" style={{ background: '#0E160E' }}>

      {/* Top hole info bar */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          background: 'rgba(14,22,14,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Back button */}
        <button
          onClick={onClose}
          className="flex items-center justify-center cursor-pointer active:scale-[0.92] transition-transform flex-shrink-0"
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(36,56,36,0.8)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EDE9DF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        {/* Hole number */}
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 44, height: 44, borderRadius: '50%', background: '#243824', border: '2px solid rgba(201,169,110,0.4)' }}
        >
          <span className="font-display text-sand text-xl font-bold">{hole.holeNumber}</span>
        </div>

        {/* Stats row */}
        <div className="flex-1 flex items-center justify-between">
          <div className="text-center">
            <p className="font-ui text-fog/60 text-xs uppercase tracking-widest">To Hole</p>
            <p className="font-display text-chalk text-lg font-bold">
              {distYards != null ? `${Math.round(distYards)}` : teeYardage}
              <span className="font-ui text-fog/60 text-xs ml-0.5">y</span>
            </p>
          </div>
          <div className="text-center">
            <p className="font-ui text-fog/60 text-xs uppercase tracking-widest">Par</p>
            <p className="font-display text-chalk text-lg font-bold">{hole.par}</p>
          </div>
          <div className="text-center">
            <p className="font-ui text-fog/60 text-xs uppercase tracking-widest">{teeColor}</p>
            <p className="font-display text-chalk text-lg font-bold">
              {teeYardage}
              <span className="font-ui text-fog/60 text-xs ml-0.5">y</span>
            </p>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1 min-h-0">
        <div ref={mapDivRef} className="w-full h-full" />

        {/* Loading overlay */}
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#0E160E' }}>
            <div className="w-6 h-6 border-2 border-sand border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Hint: tap to place pin */}
        {mapReady && !pinPos && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div
              className="px-4 py-2 rounded-full font-ui text-xs"
              style={{ background: 'rgba(14,22,14,0.85)', border: '1px solid rgba(201,169,110,0.3)', color: '#C9A96E' }}
            >
              Tap the green to set the pin
            </div>
          </div>
        )}

        {/* GPS error */}
        {gpsError && (
          <div className="absolute top-3 left-3 right-3 rounded-xl px-3 py-2" style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)' }}>
            <p className="font-ui text-bogey text-xs">GPS: {gpsError}</p>
          </div>
        )}

        {/* Wind overlay — bottom right */}
        {windSpeed != null && (
          <div
            className="absolute bottom-4 right-4 rounded-xl px-3 py-2 text-center"
            style={{ background: 'rgba(14,22,14,0.88)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <p className="font-ui text-fog/60 text-xs uppercase tracking-widest">Wind</p>
            <p className="font-display text-chalk text-lg font-bold">{windLabel}</p>
          </div>
        )}

        {/* Distance bubble — floating near player, bottom left */}
        {distYards != null && (
          <div
            className="absolute bottom-4 left-4 rounded-xl px-4 py-2"
            style={{ background: 'rgba(14,22,14,0.9)', border: '1px solid rgba(201,169,110,0.3)' }}
          >
            <p className="font-ui text-fog/60 text-xs uppercase tracking-widest">To pin</p>
            <p className="font-display text-sand text-2xl font-bold">{Math.round(distYards)}<span className="font-ui text-fog/60 text-sm ml-1">y</span></p>
          </div>
        )}
      </div>
    </div>
  )
}
