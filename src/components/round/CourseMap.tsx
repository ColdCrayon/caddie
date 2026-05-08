import { useEffect, useRef, useState } from 'react'
import { setOptions } from '@googlemaps/js-api-loader'
import type { ActiveHoleState, TeeColor } from '../../types'
import { distanceBetween } from '../../lib/gps'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined
type PlaceMode = 'pin' | 'shot'
interface LatLng { lat: number; lng: number }

// ── Marker content factories ──────────────────────────────────────────────────

function makePlayerEl(): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cssText = 'width:20px;height:0;overflow:visible;position:relative;'
  const dot = document.createElement('div')
  dot.style.cssText = `
    position:absolute;top:-10px;left:0;
    width:20px;height:20px;border-radius:50%;
    background:#4A90E2;border:3px solid white;
    box-shadow:0 0 0 8px rgba(74,144,226,0.2);
  `
  el.appendChild(dot)
  return el
}

function makeFlagEl(): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cssText = 'width:28px;height:28px;display:flex;align-items:flex-end;justify-content:center;font-size:22px;filter:drop-shadow(0 1px 4px rgba(0,0,0,0.7));cursor:grab;'
  el.textContent = '🚩'
  return el
}

function makeShotTargetEl(): HTMLDivElement {
  const outer = document.createElement('div')
  outer.style.cssText = 'width:44px;height:0;overflow:visible;position:relative;cursor:grab;'
  const inner = document.createElement('div')
  inner.style.cssText = 'position:absolute;top:0;left:0;width:44px;height:44px;transform:translateY(-50%);'
  inner.innerHTML = `<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="22" cy="22" r="18" stroke="white" stroke-width="2.5"/>
    <circle cx="22" cy="22" r="3" fill="white"/>
    <line x1="22" y1="2" x2="22" y2="11" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="22" y1="33" x2="22" y2="42" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="2" y1="22" x2="11" y2="22" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="33" y1="22" x2="42" y2="22" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`
  outer.appendChild(inner)
  return outer
}

function makeCalloutEl(yards: number): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cssText = `
    background:rgba(14,22,14,0.92);border:1px solid rgba(201,169,110,0.5);
    border-radius:10px;padding:6px 12px;white-space:nowrap;
    font-family:'Playfair Display',serif;color:#C9A96E;font-size:18px;font-weight:700;
    pointer-events:none;
    transform:translateY(-100%) translateY(-8px);
  `
  el.textContent = `${yards}y`
  return el
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  hole: ActiveHoleState
  teeColor: TeeColor
  courseLat: number | null
  courseLng: number | null
  onClose: () => void
  onPinSet?: (lat: number, lng: number, isCustom?: boolean) => void
}

export function CourseMap({ hole, teeColor, courseLat, courseLng, onClose, onPinSet }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pinMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shotMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calloutMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linePlayerShotRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineShotPinRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineDirectRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AMERef = useRef<any>(null)

  const playerPosRef = useRef<LatLng | null>(null)
  const pinPosRef = useRef<LatLng | null>(null)
  const shotPosRef = useRef<LatLng | null>(null)
  const firstGpsFix = useRef(false)
  const onPinSetRef = useRef(onPinSet)
  const modeRef = useRef<PlaceMode>('pin')
  const watchIdRef = useRef<number | null>(null)
  const calloutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [mapReady, setMapReady] = useState(false)
  const [mode, setMode] = useState<PlaceMode>('pin')
  const [playerPos, setPlayerPos] = useState<LatLng | null>(null)
  const [pinPos, setPinPos] = useState<LatLng | null>(null)
  const [shotPos, setShotPos] = useState<LatLng | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [windLabel, setWindLabel] = useState<string | null>(null)

  useEffect(() => { onPinSetRef.current = onPinSet }, [onPinSet])

  const setModeAndRef = (m: PlaceMode) => { modeRef.current = m; setMode(m) }

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

  function dismissCallout() {
    if (calloutTimerRef.current) { clearTimeout(calloutTimerRef.current); calloutTimerRef.current = null }
    if (calloutMarkerRef.current) { calloutMarkerRef.current.map = null; calloutMarkerRef.current = null }
  }

  function showCalloutAt(pos: LatLng, yards: number) {
    dismissCallout()
    if (!AMERef.current || !mapRef.current) return
    calloutMarkerRef.current = new AMERef.current({
      map: mapRef.current,
      position: pos,
      content: makeCalloutEl(yards),
    })
    calloutTimerRef.current = setTimeout(dismissCallout, 4000)
  }

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
      AMERef.current = AdvancedMarkerElement

      // Use hole pin coords for initial center if available, else course coords
      const initialCenter: LatLng = hole.pinLat && hole.pinLng
        ? { lat: hole.pinLat, lng: hole.pinLng }
        : { lat: courseLat ?? 37.09024, lng: courseLng ?? -95.71289 }

      const map = new Map(mapDivRef.current, {
        center: initialCenter,
        zoom: (hole.pinLat || courseLat) ? 17 : 4,
        mapTypeId: 'satellite', tilt: 0,
        disableDefaultUI: true, gestureHandling: 'greedy',
        mapId: 'DEMO_MAP_ID',
      })
      mapRef.current = map

      playerMarkerRef.current = new AdvancedMarkerElement({ map, position: initialCenter, content: makePlayerEl() })

      linePlayerShotRef.current = new Polyline({ map, path: [], strokeColor: '#FFFFFF', strokeOpacity: 0.9, strokeWeight: 2 })
      lineShotPinRef.current = new Polyline({
        map, path: [], strokeColor: '#C9A96E', strokeOpacity: 0, strokeWeight: 0,
        icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.85, strokeColor: '#C9A96E', scale: 3 }, offset: '0', repeat: '12px' }],
      })
      lineDirectRef.current = new Polyline({ map, path: [], strokeColor: '#FFFFFF', strokeOpacity: 0.45, strokeWeight: 1.5 })

      // Auto-place pin from hole state (green center or previously set pin)
      if (hole.pinLat && hole.pinLng) {
        const initialPin: LatLng = { lat: hole.pinLat, lng: hole.pinLng }
        placePinAt(initialPin, false) // don't fire onPinSet — pin was already set
        setModeAndRef('shot')
      }

      // Map tap handler
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.addListener('click', (e: any) => {
        const pos: LatLng = { lat: e.latLng.lat(), lng: e.latLng.lng() }
        if (modeRef.current === 'pin') {
          placePinAt(pos, true)
          onPinSetRef.current?.(pos.lat, pos.lng, true)
          setModeAndRef('shot')
        } else {
          // In shot mode — show distance callout from player to tapped point
          const player = playerPosRef.current
          if (player) {
            const d = distanceBetween(player.lat, player.lng, pos.lat, pos.lng)
            showCalloutAt(pos, Math.round(d))
          }
          placeShotAt(pos)
        }
      })

      setMapReady(true)

      // GPS watch
      if (!navigator.geolocation) { setGpsError('Geolocation not supported'); return }
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (cancelled) return
          const p: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          playerPosRef.current = p
          setPlayerPos(p)
          if (playerMarkerRef.current) playerMarkerRef.current.position = p
          if (!firstGpsFix.current && mapRef.current) { mapRef.current.panTo(p); firstGpsFix.current = true }
          updateLines()
        },
        (err) => setGpsError(err.message),
        { enableHighAccuracy: true, maximumAge: 3000 }
      )
    }

    init().catch(console.error)
    return () => {
      cancelled = true
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      if (calloutTimerRef.current) clearTimeout(calloutTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function placePinAt(pos: LatLng, fireCallback = true) {
    if (pinMarkerRef.current) pinMarkerRef.current.map = null
    if (!AMERef.current || !mapRef.current) return

    const marker = new AMERef.current({
      map: mapRef.current,
      position: pos,
      content: makeFlagEl(),
      gmpDraggable: true,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDrag = (e: any) => {
      const p: LatLng = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      pinPosRef.current = p
      updateLines()
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDragEnd = (e: any) => {
      const p: LatLng = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      pinPosRef.current = p
      setPinPos(p)
      onPinSetRef.current?.(p.lat, p.lng, true)
      updateLines()
    }
    marker.addListener('drag', handleDrag)
    marker.addListener('dragend', handleDragEnd)

    pinMarkerRef.current = marker
    pinPosRef.current = pos
    setPinPos(pos)
    if (fireCallback) onPinSetRef.current?.(pos.lat, pos.lng, true)
    updateLines()
  }

  function placeShotAt(pos: LatLng) {
    if (shotMarkerRef.current) shotMarkerRef.current.map = null
    if (!AMERef.current || !mapRef.current) return

    const marker = new AMERef.current({
      map: mapRef.current,
      position: pos,
      content: makeShotTargetEl(),
      gmpDraggable: true,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDrag = (e: any) => {
      const newPos: LatLng = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      shotPosRef.current = newPos
      updateLines()
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDragEnd = (e: any) => {
      const newPos: LatLng = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      shotPosRef.current = newPos
      setShotPos(newPos)
      updateLines()
    }
    marker.addListener('drag', handleDrag)
    marker.addListener('dragend', handleDragEnd)

    shotMarkerRef.current = marker
    shotPosRef.current = pos
    setShotPos(pos)
    updateLines()
  }

  function updateLines() {
    const player = playerPosRef.current
    const pin = pinPosRef.current
    const shot = shotPosRef.current

    if (player && shot) {
      linePlayerShotRef.current?.setPath([player, shot])
      lineDirectRef.current?.setPath([])
    } else if (player && pin) {
      lineDirectRef.current?.setPath([player, pin])
      linePlayerShotRef.current?.setPath([])
    } else {
      linePlayerShotRef.current?.setPath([])
      lineDirectRef.current?.setPath([])
    }

    if (shot && pin) {
      lineShotPinRef.current?.setPath([shot, pin])
    } else {
      lineShotPinRef.current?.setPath([])
    }
  }

  const distToShot  = playerPos && shotPos ? distanceBetween(playerPos.lat, playerPos.lng, shotPos.lat, shotPos.lng) : null
  const distShotPin = shotPos  && pinPos   ? distanceBetween(shotPos.lat,  shotPos.lng,  pinPos.lat,  pinPos.lng)   : null
  const distToPin   = playerPos && pinPos   ? distanceBetween(playerPos.lat, playerPos.lng, pinPos.lat, pinPos.lng) : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col max-w-[430px] mx-auto" style={{ background: '#0E160E' }}>

      {/* Top hole info bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
        paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: 12,
        background: 'rgba(14,22,14,0.96)', borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(36,56,36,0.8)', border: '1px solid rgba(255,255,255,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EDE9DF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: '#243824',
          border: '2px solid rgba(201,169,110,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: "'Playfair Display', serif", color: '#C9A96E', fontSize: 20, fontWeight: 700 }}>
            {hole.holeNumber}
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
          {([
            { label: 'To Hole', value: distToPin != null ? `${Math.round(distToPin)}y` : `${hole.yardage ?? '—'}y` },
            { label: 'Par', value: String(hole.par) },
            { label: teeColor, value: `${hole.yardage ?? '—'}y` },
          ]).map(({ label, value }) => (
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

        {!mapReady && (
          <div style={{ position: 'absolute', inset: 0, background: '#0E160E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="w-6 h-6 border-2 border-sand border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {mapReady && !pinPos && (
          <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)' }}>
            <div style={{ padding: '8px 16px', borderRadius: 20, background: 'rgba(14,22,14,0.9)', border: '1px solid rgba(201,169,110,0.4)', color: '#C9A96E', fontFamily: 'Archivo Narrow, sans-serif', fontSize: 12, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              Tap the green to place the pin 🚩
            </div>
          </div>
        )}

        {gpsError && (
          <div style={{ position: 'absolute', top: 12, left: 12, right: 12, background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 12, padding: '8px 12px' }}>
            <p style={{ fontFamily: 'Archivo Narrow, sans-serif', color: '#F87171', fontSize: 12, margin: 0 }}>GPS: {gpsError}</p>
          </div>
        )}

        {/* Wind — top right */}
        {windLabel && (
          <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(14,22,14,0.88)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '8px 12px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'Archivo Narrow, sans-serif', color: 'rgba(138,158,138,0.7)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Wind</p>
            <p style={{ fontFamily: "'Playfair Display', serif", color: '#EDE9DF', fontSize: 16, fontWeight: 700, margin: 0 }}>{windLabel}</p>
          </div>
        )}

        {/* Distance bubbles — left side */}
        <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {distToShot != null && (
            <div style={{ background: 'rgba(14,22,14,0.9)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '8px 14px' }}>
              <p style={{ fontFamily: 'Archivo Narrow, sans-serif', color: 'rgba(138,158,138,0.7)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Shot</p>
              <p style={{ fontFamily: "'Playfair Display', serif", color: '#EDE9DF', fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1 }}>
                {Math.round(distToShot)}<span style={{ fontSize: 12, color: 'rgba(138,158,138,0.7)', marginLeft: 2 }}>y</span>
              </p>
            </div>
          )}
          {distShotPin != null && (
            <div style={{ background: 'rgba(14,22,14,0.9)', border: '1px solid rgba(201,169,110,0.3)', borderRadius: 12, padding: '8px 14px' }}>
              <p style={{ fontFamily: 'Archivo Narrow, sans-serif', color: 'rgba(138,158,138,0.7)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>To pin</p>
              <p style={{ fontFamily: "'Playfair Display', serif", color: '#C9A96E', fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1 }}>
                {Math.round(distShotPin)}<span style={{ fontSize: 12, color: 'rgba(138,158,138,0.7)', marginLeft: 2 }}>y</span>
              </p>
            </div>
          )}
          {distToPin != null && distToShot == null && (
            <div style={{ background: 'rgba(14,22,14,0.9)', border: '1px solid rgba(201,169,110,0.3)', borderRadius: 12, padding: '8px 14px' }}>
              <p style={{ fontFamily: 'Archivo Narrow, sans-serif', color: 'rgba(138,158,138,0.7)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>To pin</p>
              <p style={{ fontFamily: "'Playfair Display', serif", color: '#C9A96E', fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1 }}>
                {Math.round(distToPin)}<span style={{ fontSize: 12, color: 'rgba(138,158,138,0.7)', marginLeft: 2 }}>y</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{
        display: 'flex', gap: 8, padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        background: 'rgba(14,22,14,0.97)', borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        {([
          { id: 'pin'  as PlaceMode, label: '🚩 Set Pin',  hint: pinPos  ? '✓ Drag to adjust' : 'Tap the green' },
          { id: 'shot' as PlaceMode, label: '◎ Set Shot',  hint: shotPos ? '✓ Drag to adjust' : 'Tap to aim' },
        ]).map(({ id, label, hint }) => (
          <button
            key={id}
            onClick={() => setModeAndRef(id)}
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
