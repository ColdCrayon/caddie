import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SafeArea } from '../components/layout/SafeArea'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useUserStore } from '../stores/userStore'
import { useRoundStore } from '../stores/roundStore'
import { useRounds } from '../hooks/useRound'
import { fetchWeather, weatherDescription, windDirectionLabel } from '../lib/weather'
import { getCurrentPosition } from '../lib/gps'

// Minimal SVG icons
const FlagIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
)
const CameraIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
)
const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)
const BrainIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.66z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.66z"/>
  </svg>
)
const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
)
const WindIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
  </svg>
)

const QUICK_ACTIONS = [
  { to: '/swing',    icon: <CameraIcon />, label: 'Analyze Swing',  sub: 'AI coach feedback' },
  { to: '/stats',    icon: <ChartIcon />,  label: 'My Stats',       sub: 'Mission control' },
  { to: '/insights', icon: <BrainIcon />,  label: 'AI Insights',    sub: 'Weekly digest' },
]

export default function Home() {
  const navigate = useNavigate()
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
    if (h < 12) return 'Good Morning'
    if (h < 17) return 'Good Afternoon'
    return 'Good Evening'
  })()

  return (
    <SafeArea>
      {/* Header */}
      <div className="px-4 pb-2" style={{ paddingTop: 'max(24px, env(safe-area-inset-top))' }}>
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <p className="font-ui text-fog text-xs uppercase tracking-widest">{greeting}</p>
          <h1 className="font-serif text-chalk" style={{ fontSize: 36, lineHeight: 1.1 }}>
            {user?.display_name ?? 'Golfer'}
          </h1>
          {/* Sand rule */}
          <div className="mt-2" style={{ width: 40, height: 1, background: '#C9A96E' }} />
        </motion.div>
      </div>

      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* Active round resume banner */}
        {activeRound && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={() => navigate('/round/active')}
              className="w-full text-left rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform"
              style={{
                background: 'radial-gradient(ellipse at 30% 20%, #2d4a2d 0%, #1B2F1B 100%)',
                border: '1px solid rgba(201,169,110,0.25)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="warning">Active Round</Badge>
                  <p className="font-serif text-chalk text-lg mt-1">{activeRound.courseName}</p>
                  <p className="font-ui text-fog text-xs mt-0.5">
                    Through {activeRound.holes.filter((h) => h.strokes > 0).length} holes
                  </p>
                </div>
                <span className="text-sand"><ArrowIcon /></span>
              </div>
            </button>
          </motion.div>
        )}

        {/* Weather strip */}
        {weather && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-ui text-fog text-xs uppercase tracking-widest">Conditions</p>
                  <p className="font-display text-chalk mt-1" style={{ fontSize: 44, lineHeight: 1 }}>
                    {weather.temp}°
                  </p>
                  <p className="font-ui text-fog text-xs mt-1">{weather.desc}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end text-fog mb-1">
                    <WindIcon />
                    <span className="font-ui text-xs uppercase tracking-widest">Wind</span>
                  </div>
                  <p className="font-display text-chalk text-2xl">{weather.wind}</p>
                  <p className="font-ui text-fog text-xs">mph {weather.windDir}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Primary CTA — Start Round */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Link to="/round">
            <button
              className="w-full flex items-center justify-between px-6 py-4 font-ui font-semibold uppercase tracking-wider
                         text-ink text-sm transition-all active:scale-[0.98] cursor-pointer"
              style={{
                background: '#C9A96E',
                borderRadius: 4,
                boxShadow: '0 4px 24px rgba(201,169,110,0.25)',
              }}
            >
              <div className="flex items-center gap-3">
                <FlagIcon />
                Start Round
              </div>
              <ArrowIcon />
            </button>
          </Link>
        </motion.div>

        {/* Quick action grid */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="grid grid-cols-3 gap-3">
            {QUICK_ACTIONS.map(({ to, icon, label, sub }) => (
              <Link key={to} to={to}>
                <Card className="p-4 flex flex-col gap-2 cursor-pointer active:scale-[0.97] transition-transform min-h-[100px]">
                  <span className="text-sand">{icon}</span>
                  <p className="font-ui text-chalk font-semibold text-xs leading-tight">{label}</p>
                  <p className="font-ui text-fog text-xs leading-tight">{sub}</p>
                </Card>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Recent rounds */}
        {recentRounds.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <p className="font-ui text-fog text-xs uppercase tracking-widest mb-3 section-rule">Recent Rounds</p>
            <div className="space-y-2">
              {recentRounds.map((round) => {
                const totalPar = round.course?.holes?.reduce((a: number, h: { par: number }) => a + h.par, 0) ?? 72
                const diff = round.total_score - totalPar
                return (
                  <Link key={round.id} to={`/round/${round.id}`}>
                    <Card className="px-5 py-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform">
                      <div>
                        <p className="font-ui text-chalk font-semibold text-sm">
                          {round.course?.name ?? 'Unknown course'}
                        </p>
                        <p className="font-ui text-fog text-xs mt-0.5">
                          {new Date(round.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-chalk text-2xl">{round.total_score}</p>
                        <p className={`font-mono text-sm font-medium ${diff <= 0 ? 'text-birdie' : 'text-bogey'}`}>
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
