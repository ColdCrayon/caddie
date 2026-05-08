import { useEffect, useRef, useState } from 'react'
import { setOptions } from '@googlemaps/js-api-loader'
import type { ActiveHoleState, TeeColor } from '../../types'
import { distanceBetween } from '../../lib/gps'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined

type PlaceMode = 'pin' | 'shot'

interface LatLng { lat: number; lng: number }

interface Props {
  hole: ActiveHoleState
  teeColor: TeeColor
  courseLat: number | null
  courseLng: number | null
  onClose: () => void
  onPinSet?: (lat: number, lng: number) => void
}

// SVG crosshair for shot target
function makeShotTargetEl(): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cssText = 'width:44px;height:44px;position:relative;'
  el.innerHTML = `<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="22" cy="22" r="19" stroke="white" stroke-width="2" stroke-opacity="0.9"/>
    <circle cx="22" cy="22" r="3" fill="white"/>
    <line x1="22" y1="4" x2="22" y2="13" stroke="white" stroke-width="2"/>
    <line x1="22" y1="31" x2="22" y2="40" stroke="white" stroke-width="2"/>
    <line x1="4" y1="22" x2="13" y2="22" stroke="white" stroke-width="2"/>
    <line x1="31" y1="22" x2="40" y2="22" stroke="white" stroke-width="2"/>
  </svg>`
  return el
}

function makeFlagEl(): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cssText = 'width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:24px;filter:drop-shadow(0 1px 4px rgba(0,0,0,0.7));'
  el.textContent = '🚩'
  return el
}

function makePlayerEl(): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cssText = `
    width:18px;height:18px;border-radius:50%;
    background:#4A90E2;border:3px solid white;
    box-shadow:0 0 0 7px rgba(74,144,226,0.22);
  `
  return el
}

export function CourseMap({ hole, teeColor, courseLat, courseLng, onClose, onPinSet }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null)

  // All map objects in refs — never cause re-renders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pinMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shotMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linePlayerToShotRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineShotToPinRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linePlayerToPinRef = useRef<any>(null)
  const watchIdRef = useRef<number | null>(null)
  const firstGpsFix = useRef(false)
  const onPinSetRef = useRef(onPinSet)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AMERef = useRef<any>(null)

  // UI state only
  const [mapReady, setMapReady] = useState(false)
  const [mode, setMode] = useState<PlaceMode>('pin')
  const [playerPos, setPlayerPos] = useState<LatLng | null>(null)
  const [pinPos, setPinPos] = useState<LatLng | null>(null)
  const [shotPos, setShotPos] = useState<LatLng | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [windLabel, setWindLabel] = useState<string | null>(null)

  useEffect(() => { onPinSetRef.current = onPinSet }, [onPinSet])

  // Fetch wind once
  useEffect(() => {
    const lat = courseLat; const lng = courseLng
    if (!lat || !lng) return
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=mph`)
      .then(r => r.json())
      .then(d => {
        const spd = Math.round(d.current?.wind_speed_10m ?? 0)
        const deg = d.current?.wind_direction_10m ?? 0
        const dirs = ['N','NE','E','SE','S','SW','W','NW']
        setWindLabel(`${spd} mph ${dirs[Math.round(deg / 45) % 8]}`)
      }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ONE-TIME map init — all dynamics go through refs
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
      AMERef.current = AdvancedMarkerElement

      const center = { lat: courseLat ?? 37.09024, lng: courseLng ?? -95.71289 }
      const map = new Map(mapDivRef.current, {
        center, zoom: courseLat ? 17 : 4,
        mapTypeId: 'satellite', tilt: 0,
        disableDefaultUI: true, gestureHandling: 'greedy',
        mapId: 'DEMO_MAP_ID',
      })
      mapRef.current = map

      // Player marker
      playerMarkerRef.current = new AdvancedMarkerElement({ map, position: center, content: makePlayerEl() })

      // Polyline: player → shot target (white solid)
      linePlayerToShotRef.current = new Polyline({
        map, path: [], strokeColor: '#FFFFFF', strokeOpacity: 0.9, strokeWeight: 2,
      })

      // Polyline: shot target → pin (sand dashed)
      lineShotToPinRef.current = new Polyline({
        map, path: [], strokeColor: '#C9A96E', strokeOpacity: 0.8, strokeWeight: 2,
        strokeDasharray: '6,4',
      })

      // Polyline: player → pin direct (white faint, shown when no shot target)
      linePlayerToPinRef.current = new Polyline({
        map, path: [], strokeColor: '#FFFFFF', strokeOpacity: 0.55, strokeWeight: 1.5,
      })

      // Tap handler — reads mode from a ref so the closure stays stable
      const getModeRef = () => (document.getElementById('__courseMapModeRef__') as HTMLInputElement)?.value as PlaceMode ?? 'pin'

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.addListener('click', (e: any) => {
        const pos: LatLng = { lat: e.latLng.lat(), lng: e.latLng.lng() }
        const currentMode = getModeRef()
        if (currentMode === 'pin') {
          placePinAt(pos)
          onPinSetRef.current?.(pos.lat, pos.lng)
          // Auto-advance to shot mode after placing pin
          const modeInput = document.getElementById('__courseMapModeRef__') as HTMLInputElement
          if (modeInput) modeInput.value = 'shot'
          setMode('shot')
        } else {
          placeShotAt(pos)
        }
      })

      setMapReady(true)

      // GPS
      if (!navigator.geolocation) { setGpsError('Geolocation not supported'); return }
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (cancelled) return
          const p: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setPlayerPos(p)
          if (playerMarkerRef.current) playerMarkerRef.current.position = p
          if (!firstGpsFix.current && mapRef.current) { mapRef.current.panTo(p); firstGpsFix.current = true }
          refreshLines()
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
  }, [])

  function placePinAt(pos: LatLng) {
    if (pinMarkerRef.current) pinMarkerRef.current.map = null
    if (!AMERef.current || !mapRef.current) return
    pinMarkerRef.current = new AMERef.current({ map: mapRef.current, position: pos, content: makeFlagEl() })
    setPinPos(pos)
    refreshLines(undefined, pos, undefined)
  }

  function placeShotAt(pos: LatLng) {
    if (shotMarkerRef.current) shotMarkerRef.current.map = null
    if (!AMERef.current || !mapRef.current) return
    shotMarkerRef.current = new AMERef.current({ map: mapRef.current, position: pos, content: makeShotTargetEl() })
    setShotPos(pos)
    refreshLines(undefined, undefined, pos)
  }

  function refreshLines(
    pPlayer?: LatLng | null,
    pPin?: LatLng | null,
    pShot?: LatLng | null,
  ) {
    // Read current positions from refs when not passed in
    const player = pPlayer !== undefined ? pPlayer : playerMarkerRef.current?.position ?? null
    const pin = pPin !== undefined ? pPin : pinMarkerRef.current?.position ?? null
    const shot = pShot !== undefined ? pShot : shotMarkerRef.current?.position ?? null

    if (shot && player) {
      linePlayerToShotRef.current?.setPath([player, shot])
      linePlayerToPinRef.current?.setPath([])
    } else if (player && pin) {
      linePlayerToPinRef.current?.setPath([player, pin])
      linePlayerToShotRef.current?.setPath([])
    } else {
      linePlayerToShotRef.current?.setPath([])
      linePlayerToPinRef.current?.setPath([])
    }

    if (shot && pin) {
      lineShotToPinRef.current?.setPath([shot, pin])
    } else {
      lineShotToPinRef.current?.setPath([])
    }
  }

  // Derived distances for display
  const distPlayerToShot = playerPos && shotPos ? distanceBetween(playerPos.lat, playerPos.lng, shotPos.lat, shotPos.lng) : null
  const distShotToPin = shotPos && pinPos ? distanceBetween(shotPos.lat, shotPos.lng, pinPos.lat, pinPos.lng) : null
  const distPlayerToPin = playerPos && pinPos ? distanceBetween(playerPos.lat, playerPos.lng, pinPos.lat, pinPos.lng) : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col max-w-[430px] mx-auto" style={{ background: '#0E160E' }}>

      {/* Top hole info bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
        paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: 12,
        background: 'rgba(14,22,14,0.96)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(36,56,36,0.8)', border: '1px solid rgba(255,255,255,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EDE9DF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: '#243824', border: '2px solid rgba(201,169,110,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: "'Playfair Display', serif", color: '#C9A96E', fontSize: 20, fontWeight: 700 }}>
            {hole.holeNumber}
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
          {[
            { label: 'To Hole', value: distPlayerToPin != null ? `${Math.round(distPlayerToPin)}y` : `${hole.yardage ?? '—'}y` },
            { label: 'Par',     value: String(hole.par) },
            { label: teeColor,  value: `${hole.yardage ?? '—'}y` },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'Archivo Narrow, sans-serif', color: 'rgba(138,158,138,0.7)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{label}</p>
              <p style={{ fontFamily: "'Playfair Display', serif", color: '#EDE9DF', fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />

        {/* Hidden input to pass mode into the stable map click closure */}
        <input id="__courseMapModeRef__" type="hidden" value={mode} />

        {!mapReady && (
          <div style={{ position: 'absolute', inset: 0, background: '#0E160E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="w-6 h-6 border-2 border-sand border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Hint */}
        {mapReady && !pinPos && (
          <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)' }}>
            <div style={{ padding: '8px 16px', borderRadius: 20, background: 'rgba(14,22,14,0.88)', border: '1px solid rgba(201,169,110,0.35)', color: '#C9A96E', fontFamily: 'Archivo Narrow, sans-serif', fontSize: 12, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              Tap the green to place the pin
            </div>
          </div>
        )}

        {/* GPS error */}
        {gpsError && (
          <div style={{ position: 'absolute', top: 12, left: 12, right: 12, background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 12, padding: '8px 12px' }}>
            <p style={{ fontFamily: 'Archivo Narrow, sans-serif', color: '#F87171', fontSize: 12, margin: 0 }}>GPS: {gpsError}</p>
          </div>
        )}

        {/* Wind overlay — top right */}
        {windLabel && (
          <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(14,22,14,0.88)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '8px 12px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'Archivo Narrow, sans-serif', color: 'rgba(138,158,138,0.7)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Wind</p>
            <p style={{ fontFamily: "'Playfair Display', serif", color: '#EDE9DF', fontSize: 16, fontWeight: 700, margin: 0 }}>{windLabel}</p>
          </div>
        )}

        {/* Distance bubbles — left side, stacked */}
        <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {distPlayerToShot != null && (
            <div style={{ background: 'rgba(14,22,14,0.9)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '8px 14px' }}>
              <p style={{ fontFamily: 'Archivo Narrow, sans-serif', color: 'rgba(138,158,138,0.7)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Shot</p>
              <p style={{ fontFamily: "'Playfair Display', serif", color: '#EDE9DF', fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1 }}>
                {Math.round(distPlayerToShot)}<span style={{ fontSize: 12, color: 'rgba(138,158,138,0.7)', marginLeft: 2 }}>y</span>
              </p>
            </div>
          )}
          {distShotToPin != null && (
            <div style={{ background: 'rgba(14,22,14,0.9)', border: '1px solid rgba(201,169,110,0.25)', borderRadius: 12, padding: '8px 14px' }}>
              <p style={{ fontFamily: 'Archivo Narrow, sans-serif', color: 'rgba(138,158,138,0.7)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>To pin</p>
              <p style={{ fontFamily: "'Playfair Display', serif", color: '#C9A96E', fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1 }}>
                {Math.round(distShotToPin)}<span style={{ fontSize: 12, color: 'rgba(138,158,138,0.7)', marginLeft: 2 }}>y</span>
              </p>
            </div>
          )}
          {distPlayerToPin != null && !distPlayerToShot && (
            <div style={{ background: 'rgba(14,22,14,0.9)', border: '1px solid rgba(201,169,110,0.3)', borderRadius: 12, padding: '8px 14px' }}>
              <p style={{ fontFamily: 'Archivo Narrow, sans-serif', color: 'rgba(138,158,138,0.7)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>To pin</p>
              <p style={{ fontFamily: "'Playfair Display', serif", color: '#C9A96E', fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1 }}>
                {Math.round(distPlayerToPin)}<span style={{ fontSize: 12, color: 'rgba(138,158,138,0.7)', marginLeft: 2 }}>y</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mode toggle bar */}
      <div style={{
        display: 'flex', gap: 8, padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        background: 'rgba(14,22,14,0.97)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        {([
          { id: 'pin',  label: '🚩 Set Pin',    hint: pinPos  ? '✓ Pin placed'   : 'Tap the green' },
          { id: 'shot', label: '◎ Set Shot',    hint: shotPos ? '✓ Shot planned' : 'Tap fairway' },
        ] as { id: PlaceMode; label: string; hint: string }[]).map(({ id, label, hint }) => (
          <button
            key={id}
            onClick={() => {
              setMode(id)
              const inp = document.getElementById('__courseMapModeRef__') as HTMLInputElement
              if (inp) inp.value = id
            }}
            style={{
              flex: 1, borderRadius: 10, padding: '10px 0', cursor: 'pointer',
              border: mode === id ? '1px solid rgba(201,169,110,0.5)' : '1px solid rgba(255,255,255,0.08)',
              background: mode === id ? 'rgba(201,169,110,0.14)' : 'rgba(36,56,36,0.5)',
              transition: 'all 0.15s',
            }}
          >
            <p style={{ fontFamily: 'Archivo Narrow, sans-serif', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.07em', color: mode === id ? '#C9A96E' : 'rgba(237,233,223,0.6)', margin: '0 0 2px' }}>{label}</p>
            <p style={{ fontFamily: 'Archivo Narrow, sans-serif', fontSize: 11, color: 'rgba(138,158,138,0.6)', margin: 0 }}>{hint}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
