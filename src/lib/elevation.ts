import type { PlaysLike } from '../types'

const METERS_TO_FEET = 3.28084
const YARDS_PER_FOOT_UPHILL = 1.0
const YARDS_PER_FOOT_DOWNHILL = 0.5

export async function fetchElevationPair(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): Promise<[number, number]> {
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat1},${lat2}&longitude=${lng1},${lng2}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Elevation API error')
  const data = await res.json()
  const elevations: number[] = data.elevation
  if (!elevations || elevations.length < 2) throw new Error('Invalid elevation response')
  return [elevations[0], elevations[1]]
}

export function computePlaysLike(
  rawDistYards: number,
  playerElevM: number,
  pinElevM: number
): PlaysLike {
  const elevDiffM = pinElevM - playerElevM
  const elevDiffFt = elevDiffM * METERS_TO_FEET

  // Horizontal distance in feet for grade calculation
  const rawDistFt = rawDistYards * 3
  const grade = rawDistFt > 0 ? (Math.abs(elevDiffFt) / rawDistFt) * 100 : 0

  let adjustment: number
  if (elevDiffFt > 0) {
    // Pin is uphill — add 1 yard per foot uphill
    adjustment = elevDiffFt * YARDS_PER_FOOT_UPHILL
  } else {
    // Pin is downhill — subtract 0.5 yards per foot downhill
    adjustment = elevDiffFt * YARDS_PER_FOOT_DOWNHILL
  }

  return {
    distance: Math.round(rawDistYards + adjustment),
    rawDistance: Math.round(rawDistYards),
    elevDiffFt: Math.round(elevDiffFt * 10) / 10,
    grade: Math.round(grade * 10) / 10,
  }
}
