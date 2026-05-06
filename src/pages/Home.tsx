import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SafeArea } from '../components/layout/SafeArea'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useUserStore } from '../stores/userStore'
import { useRoundStore } from '../stores/roundStore'
import { useRounds } from '../hooks/useRound'
import { fetchWeather, weatherDescription, windDirectionLabel } from '../lib/weather'
import { getCurrentPosition } from '../lib/gps'

export default function Home() {
  const user = useUserStore((s) => s.user)
  const activeRound = useRoundStore((s) => s.activeRound)
  const { data: rounds } = useRounds(user?.id)
  const [weather, setWeather] = useState<{ temp: number; wind: number; windDir: string; desc: string } | null>(null)

  useEffect(() => {
    getCurrentPosition()
      .then((pos) => fetchWeather(pos.lat, pos.lng))
      .then((w) => {
        setWeather({
          temp: Math.round(w.current.temperature),
          wind: Math.round(w.current.wind_speed),
          windDir: windDirectionLabel(w.current.wind_direction),
          desc: weatherDescription(w.current.weather_code),
        })
      })
      .catch(() => {})
  }, [])

  const recentRounds = rounds?.slice(0, 3) ?? []
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Morning'
    if (h < 17) return 'Afternoon'
    return 'Evening'
  })()

  return (
    <SafeArea>
      {/* Header */}
      <div
        className="px-4 pb-4"
        style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}
      >
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-ui text-chalk/50 text-sm">{greeting},</p>
          <h1 className="font-display text-chalk text-3xl font-bold">
            {user?.display_name ?? 'Golfer'}
          </h1>
        </motion.div>
      </div>

      <div className="px-4 space-y-4">
        {/* Active round banner */}
        {activeRound && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <Link to="/round/active">
              <Card className="p-4 border border-sand/30 bg-sand/5">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant="warning">Active Round</Badge>
                    <p className="font-display text-chalk font-semibold mt-1">
                      {activeRound.courseName}
                    </p>
                    <p className="font-ui text-chalk/50 text-sm">
                      Through {activeRound.holes.filter((h) => h.strokes > 0).length} holes
                    </p>
                  </div>
                  <span className="text-3xl">→</span>
                </div>
              </Card>
            </Link>
          </motion.div>
        )}

        {/* Weather */}
        {weather && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest">Conditions</p>
                  <p className="font-mono text-sky text-4xl font-bold">{weather.temp}°</p>
                  <p className="font-ui text-chalk/60 text-sm mt-0.5">{weather.desc}</p>
                </div>
                <div className="text-right">
                  <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest">Wind</p>
                  <p className="font-mono text-chalk text-2xl font-bold">{weather.wind} mph</p>
                  <p className="font-ui text-chalk/60 text-sm">{weather.windDir}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/round">
              <Card className="p-4 flex flex-col gap-2 active:scale-98 transition-transform">
                <span className="text-2xl">🏌️</span>
                <p className="font-ui text-chalk font-semibold text-sm">Start Round</p>
                <p className="font-ui text-chalk/40 text-xs">Track your game</p>
              </Card>
            </Link>
            <Link to="/swing">
              <Card className="p-4 flex flex-col gap-2 active:scale-98 transition-transform">
                <span className="text-2xl">🎥</span>
                <p className="font-ui text-chalk font-semibold text-sm">Analyze Swing</p>
                <p className="font-ui text-chalk/40 text-xs">AI coach feedback</p>
              </Card>
            </Link>
            <Link to="/stats">
              <Card className="p-4 flex flex-col gap-2 active:scale-98 transition-transform">
                <span className="text-2xl">📊</span>
                <p className="font-ui text-chalk font-semibold text-sm">My Stats</p>
                <p className="font-ui text-chalk/40 text-xs">Mission control</p>
              </Card>
            </Link>
            <Link to="/insights">
              <Card className="p-4 flex flex-col gap-2 active:scale-98 transition-transform">
                <span className="text-2xl">🧠</span>
                <p className="font-ui text-chalk font-semibold text-sm">AI Insights</p>
                <p className="font-ui text-chalk/40 text-xs">Weekly digest</p>
              </Card>
            </Link>
          </div>
        </motion.div>

        {/* Recent rounds */}
        {recentRounds.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest mb-2">Recent Rounds</p>
            <div className="space-y-2">
              {recentRounds.map((round) => {
                const diff = round.total_score - (round.course?.holes?.reduce((a: number, h: { par: number }) => a + h.par, 0) ?? 72)
                return (
                  <Link key={round.id} to={`/round/${round.id}`}>
                    <Card className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-ui text-chalk font-semibold text-sm">
                          {round.course?.name ?? 'Unknown course'}
                        </p>
                        <p className="font-ui text-chalk/40 text-xs">
                          {new Date(round.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-chalk text-xl font-bold">{round.total_score}</p>
                        <p className={`font-mono text-sm ${diff <= 0 ? 'text-birdie' : 'text-bogey'}`}>
                          {diff === 0 ? 'E' : diff > 0 ? `+${diff}` : diff}
                        </p>
                      </div>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </motion.div>
        )}
      </div>
    </SafeArea>
  )
}
