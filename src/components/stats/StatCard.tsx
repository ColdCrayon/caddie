import { Card } from '../ui/Card'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  color?: string
}

export function StatCard({ label, value, sub, color = 'text-sand' }: StatCardProps) {
  return (
    <Card className="p-4">
      <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest mb-1">{label}</p>
      <p className={`font-mono text-4xl font-bold leading-none ${color}`}>{value}</p>
      {sub && <p className="font-ui text-chalk/50 text-xs mt-1">{sub}</p>}
    </Card>
  )
}
