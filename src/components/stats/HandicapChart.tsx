import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface HandicapChartProps {
  data: { date: string; index: number }[]
}

export function HandicapChart({ data }: HandicapChartProps) {
  if (data.length < 2) {
    return (
      <div className="h-32 flex items-center justify-center">
        <p className="font-ui text-chalk/30 text-sm">Need more rounds for trend</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <XAxis
          dataKey="date"
          tick={{ fill: '#e8e4d940', fontSize: 10, fontFamily: 'DM Mono' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          reversed
          tick={{ fill: '#e8e4d940', fontSize: 10, fontFamily: 'DM Mono' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: '#2d4a2d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          labelStyle={{ color: '#e8e4d9', fontFamily: 'Archivo Narrow', fontSize: 11 }}
          itemStyle={{ color: '#c8a96e', fontFamily: 'DM Mono', fontSize: 12 }}
          formatter={(val) => [Number(val).toFixed(1), 'Handicap']}
        />
        <Line
          type="monotone"
          dataKey="index"
          stroke="#c8a96e"
          strokeWidth={2}
          dot={{ fill: '#c8a96e', r: 3, strokeWidth: 0 }}
          activeDot={{ fill: '#c8a96e', r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
