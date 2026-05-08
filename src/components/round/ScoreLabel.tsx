import type { ScoreLabel as SL } from '../../types'

const colors: Record<SL, string> = {
  Eagle: 'text-eagle',
  Birdie: 'text-birdie',
  Par: 'text-chalk',
  Bogey: 'text-bogey',
  Double: 'text-bogey/80',
  'Triple+': 'text-bogey/60',
}

export function ScoreLabel({ label }: { label: SL | undefined }) {
  if (!label) return <></>
  return (
    <span className={`font-ui text-xs font-semibold uppercase tracking-wider ${colors[label]}`}>
      {label}
    </span>
  )
}
