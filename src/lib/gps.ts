export interface GPSPosition {
  lat: number
  lng: number
  accuracy: number
}

export interface GreenDistances {
  front: number
  middle: number
  back: number
}

export function getCurrentPosition(): Promise<GPSPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  })
}

export function watchPosition(
  onUpdate: (pos: GPSPosition) => void,
  onError?: (err: GeolocationPositionError) => void
): number {
  if (!navigator.geolocation) return -1
  return navigator.geolocation.watchPosition(
    (pos) => onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
    (err) => onError?.(err),
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
  )
}

export function clearWatch(id: number) {
  if (id >= 0) navigator.geolocation.clearWatch(id)
}

/** Haversine distance — returns yards */
export function distanceBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  const meters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(meters * 1.09361)
}

/**
 * Compute front/middle/back-of-green distances from the player's position.
 * Pass GPS coordinates if known; otherwise estimates using ±15 yard offsets.
 */
export function getDistancesToGreen(
  playerLat: number,
  playerLng: number,
  greenCenter: { lat: number; lng: number },
  greenFront?: { lat: number; lng: number },
  greenBack?: { lat: number; lng: number }
): GreenDistances {
  const middle = distanceBetween(playerLat, playerLng, greenCenter.lat, greenCenter.lng)
  const front  = greenFront
    ? distanceBetween(playerLat, playerLng, greenFront.lat, greenFront.lng)
    : Math.max(0, middle - 15)
  const back   = greenBack
    ? distanceBetween(playerLat, playerLng, greenBack.lat, greenBack.lng)
    : middle + 15
  return { front, middle, back }
}

/** True if player is within threshold yards of a coordinate (for auto-hole detection) */
export function isNearPoint(
  playerLat: number,
  playerLng: number,
  pointLat: number,
  pointLng: number,
  thresholdYards = 50
): boolean {
  return distanceBetween(playerLat, playerLng, pointLat, pointLng) <= thresholdYards
}
