export function scoreDifferential(
  adjustedGrossScore: number,
  courseRating: number,
  slopeRating: number
): number {
  return ((adjustedGrossScore - courseRating) * 113) / slopeRating
}

export function handicapIndex(differentials: number[]): number {
  if (differentials.length === 0) return 0
  const sorted = [...differentials].sort((a, b) => a - b)
  const count = Math.min(differentials.length, 20)
  const best = getBestCount(count)
  const bestDiffs = sorted.slice(0, best)
  const avg = bestDiffs.reduce((a, b) => a + b, 0) / bestDiffs.length
  return Math.round(avg * 10) / 10
}

function getBestCount(rounds: number): number {
  if (rounds >= 20) return 8
  if (rounds >= 19) return 7
  if (rounds >= 17) return 6
  if (rounds >= 14) return 5
  if (rounds >= 11) return 4
  if (rounds >= 9) return 3
  if (rounds >= 7) return 2
  if (rounds >= 5) return 1
  return 1
}

export function getScoreLabel(strokes: number, par: number): import('../types').ScoreLabel {
  const diff = strokes - par
  if (diff <= -2) return 'Eagle'
  if (diff === -1) return 'Birdie'
  if (diff === 0) return 'Par'
  if (diff === 1) return 'Bogey'
  if (diff === 2) return 'Double'
  return 'Triple+'
}
