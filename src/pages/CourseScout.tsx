import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SafeArea } from '../components/layout/SafeArea'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import { fetchCourseScout } from '../lib/claude'
import { fetchWeather, weatherDescription, windDirectionLabel } from '../lib/weather'
import type { Course, CourseGamePlan } from '../types'

export default function CourseScout() {
  const { id } = useParams<{ id: string }>()
  const [course, setCourse] = useState<Course | null>(null)
  const [gamePlan, setGamePlan] = useState<CourseGamePlan | null>(null)
  const [generating, setGenerating] = useState(false)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [weather, setWeather] = useState<{ temp: number; wind: number; windDir: string; desc: string } | null>(null)

  useEffect(() => {
    if (!id) return
    supabase.from('courses').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (data) {
          setCourse(data as Course)
          fetchWeather(data.lat, data.lng).then((w) => {
            setWeather({
              temp: Math.round(w.current.temperature),
              wind: Math.round(w.current.wind_speed),
              windDir: windDirectionLabel(w.current.wind_direction),
              desc: weatherDescription(w.current.weather_code),
            })
          }).catch(() => {})
        }
      })

    supabase.from('course_game_plans').select('*').eq('course_id', id).maybeSingle()
      .then(({ data }) => {
        if (data) setGamePlan(data as CourseGamePlan)
      })
  }, [id])

  const generateGamePlan = async () => {
    if (!course) return
    setGenerating(true)
    try {
      const holes = course.holes.map((h) => ({
        number: h.number,
        par: h.par,
        yardage: h.yardage.white,
      }))
      const raw = await fetchCourseScout(holes)
      const parsed = JSON.parse(raw)

      const { data } = await supabase
        .from('course_game_plans')
        .upsert({ course_id: course.id, holes: parsed.holes, generated_at: new Date().toISOString() })
        .select()
        .single()

      if (data) setGamePlan(data as CourseGamePlan)
    } catch (e) {
      console.error(e)
    }
    setGenerating(false)
  }

  const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

  return (
    <SafeArea>
      <PageHeader title={course?.name ?? 'Course Scout'} subtitle="Pre-round strategy" back />
      <div className="px-4 py-4 space-y-4">
        {/* Weather */}
        {weather && (
          <Card className="p-4 flex justify-between items-center">
            <div>
              <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest">Conditions</p>
              <p className="font-mono text-sky text-3xl font-bold">{weather.temp}°F</p>
              <p className="font-ui text-chalk/60 text-sm">{weather.desc}</p>
            </div>
            <div className="text-right">
              <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest">Wind</p>
              <p className="font-mono text-chalk text-2xl font-bold">{weather.wind} mph</p>
              <p className="font-ui text-chalk/50 text-sm">{weather.windDir}</p>
            </div>
          </Card>
        )}

        {/* Game plan */}
        {!gamePlan && !generating && (
          <Button onClick={generateGamePlan} className="w-full" size="lg">
            🧠 Generate Game Plan (AI)
          </Button>
        )}

        {generating && (
          <div className="flex flex-col items-center py-12 space-y-3">
            <div className="w-10 h-10 border-2 border-sand border-t-transparent rounded-full animate-spin" />
            <p className="font-ui text-chalk/50 text-sm">Consulting your caddie…</p>
          </div>
        )}

        {gamePlan && course && (
          <div className="space-y-3">
            <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest">Hole-by-Hole Strategy</p>
            {gamePlan.holes.map((h, i) => (
              <motion.div
                key={h.number}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {/* Map thumbnail */}
                    {GOOGLE_MAPS_KEY && course.lat && (
                      <img
                        src={`https://maps.googleapis.com/maps/api/staticmap?center=${course.lat},${course.lng}&zoom=16&size=80x60&maptype=satellite&key=${GOOGLE_MAPS_KEY}`}
                        alt={`Hole ${h.number}`}
                        className="w-20 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sand text-lg font-bold">#{h.number}</span>
                        <span className="font-ui text-chalk/40 text-xs">
                          Par {course.holes[i]?.par} · {course.holes[i]?.yardage.white}y
                        </span>
                      </div>
                      <p className="font-ui text-chalk/80 text-sm leading-relaxed">{h.tip}</p>
                    </div>
                  </div>

                  {/* User notes */}
                  <textarea
                    placeholder="Add your notes…"
                    value={notes[h.number] ?? ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [h.number]: e.target.value }))}
                    className="w-full bg-ink/40 border border-white/10 rounded-xl px-3 py-2 font-ui text-chalk/80
                               text-sm placeholder:text-chalk/20 focus:outline-none focus:border-sand/30 resize-none"
                    rows={2}
                  />
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </SafeArea>
  )
}
