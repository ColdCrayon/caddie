import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { setOptions } from '@googlemaps/js-api-loader'
import { SafeArea } from '../components/layout/SafeArea'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { SkeletonCard } from '../components/ui/SkeletonLoader'
import { useUserStore } from '../stores/userStore'
import { useRoundStore } from '../stores/roundStore'
import { useRounds } from '../hooks/useRound'
import { supabase } from '../lib/supabase'
import type { Course, HoleData, TeeColor } from '../types'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

type Step = 'search' | 'tee-select' | 'hole-entry' | 'ready'

export default function Round() {
  const navigate = useNavigate()
  const user = useUserStore((s) => s.user)
  const startRound = useRoundStore((s) => s.startRound)
  const { data: rounds, isLoading } = useRounds(user?.id)

  const [step, setStep] = useState<Step>('search')
  const [courseInput, setCourseInput] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [teeColor, setTeeColor] = useState<TeeColor>('white')
  const [holeData, setHoleData] = useState<HoleData[]>([])
  const [saving, setSaving] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!GOOGLE_MAPS_KEY || !inputRef.current) return
    setOptions({ key: GOOGLE_MAPS_KEY, v: 'weekly' })
    import('@googlemaps/js-api-loader').then(({ importLibrary }) =>
      importLibrary('places').then(() => {
        if (!inputRef.current) return
        // @ts-expect-error google global loaded by JS API loader
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['establishment'],
          fields: ['place_id', 'name', 'geometry', 'formatted_address'],
        })
        autocompleteRef.current.addListener('place_changed', handlePlaceSelect)
      })
    )
  }, [step])

  const handlePlaceSelect = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const place: any = autocompleteRef.current?.getPlace()
    if (!place?.place_id) return

    const { data: existing } = await supabase
      .from('courses')
      .select('*')
      .eq('google_place_id', place.place_id)
      .single()

    if (existing) {
      setSelectedCourse(existing as Course)
      setStep('tee-select')
    } else {
      const blanks: HoleData[] = Array.from({ length: 18 }, (_, i) => ({
        number: i + 1,
        par: 4,
        yardage: { black: 0, blue: 0, white: 0, red: 0 },
      }))
      setHoleData(blanks)
      const newCourse: Omit<Course, 'id' | 'created_at'> = {
        name: place.name ?? 'Unknown Course',
        location: place.formatted_address ?? '',
        google_place_id: place.place_id,
        lat: place.geometry?.location?.lat() ?? 0,
        lng: place.geometry?.location?.lng() ?? 0,
        holes: blanks,
        tee_options: ['black', 'blue', 'white', 'red'],
      }
      setCourseInput(newCourse.name)
      setSelectedCourse({ ...newCourse, id: '', created_at: '' })
      setStep('hole-entry')
    }
  }

  const saveAndContinue = async () => {
    if (!selectedCourse || !user) return
    setSaving(true)
    try {
      let course = selectedCourse
      if (!course.id) {
        const { data, error } = await supabase
          .from('courses')
          .insert({ ...selectedCourse, holes: holeData, id: undefined, created_at: undefined })
          .select()
          .single()
        if (error) throw error
        course = data as Course
        setSelectedCourse(course)
      }
      setSelectedCourse(course)
      setStep('tee-select')
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const beginRound = async () => {
    if (!selectedCourse || !user) return
    setSaving(true)
    try {
      const { data: round, error } = await supabase
        .from('rounds')
        .insert({
          user_id: user.id,
          course_id: selectedCourse.id,
          date: new Date().toISOString(),
          tee_color: teeColor,
          completed: false,
          total_score: 0,
          notes: '',
        })
        .select()
        .single()
      if (error) throw error

      const teeHoles = (selectedCourse.holes ?? holeData).map((h) => ({
        par: h.par,
        yardage: h.yardage[teeColor] || h.yardage.white || 400,
      }))

      startRound({
        roundId: round.id,
        courseId: selectedCourse.id,
        courseName: selectedCourse.name,
        teeColor,
        holes: teeHoles,
      })

      navigate('/round/active')
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  return (
    <SafeArea>
      <PageHeader title="Round" subtitle="Start or review your rounds" />
      <div className="px-4 py-4 space-y-4">
        {/* Start new round */}
        <Card className="p-5 space-y-4">
          <h2 className="font-display text-chalk text-lg font-semibold">New Round</h2>

          {step === 'search' && (
            <div>
              <p className="font-ui text-chalk/50 text-sm mb-2">Search for a course</p>
              <input
                ref={inputRef}
                type="text"
                value={courseInput}
                onChange={(e) => setCourseInput(e.target.value)}
                placeholder="Augusta National…"
                className="w-full bg-ink border border-white/10 rounded-xl px-4 py-3 font-ui text-chalk
                           placeholder:text-chalk/30 focus:outline-none focus:border-sand/50"
              />
              {!GOOGLE_MAPS_KEY && (
                <p className="font-ui text-bogey/70 text-xs mt-2">
                  Google Maps API key not configured — add VITE_GOOGLE_MAPS_KEY to .env
                </p>
              )}
            </div>
          )}

          {step === 'hole-entry' && (
            <div className="space-y-3">
              <p className="font-ui text-chalk/60 text-sm">
                New course — enter hole data (par + yardage per tee)
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {holeData.map((h, i) => (
                  <div key={h.number} className="flex items-center gap-2">
                    <span className="font-mono text-chalk/50 text-xs w-6 text-right">{h.number}</span>
                    <select
                      value={h.par}
                      onChange={(e) => {
                        const copy = [...holeData]
                        copy[i] = { ...copy[i], par: Number(e.target.value) }
                        setHoleData(copy)
                      }}
                      className="bg-ink border border-white/10 rounded-lg px-2 py-1.5 font-mono text-chalk text-sm w-16"
                    >
                      {[3, 4, 5].map((p) => <option key={p} value={p}>P{p}</option>)}
                    </select>
                    <input
                      type="number"
                      placeholder="White yds"
                      value={h.yardage.white || ''}
                      onChange={(e) => {
                        const copy = [...holeData]
                        copy[i] = { ...copy[i], yardage: { ...copy[i].yardage, white: Number(e.target.value) } }
                        setHoleData(copy)
                      }}
                      className="flex-1 bg-ink border border-white/10 rounded-lg px-2 py-1.5 font-mono text-chalk text-sm"
                    />
                  </div>
                ))}
              </div>
              <Button onClick={saveAndContinue} disabled={saving} className="w-full">
                {saving ? 'Saving…' : 'Save Course & Continue'}
              </Button>
            </div>
          )}

          {step === 'tee-select' && selectedCourse && (
            <div className="space-y-4">
              <p className="font-display text-sand font-semibold">{selectedCourse.name}</p>
              <div>
                <p className="font-ui text-chalk/50 text-xs uppercase tracking-widest mb-2">Select Tee</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['black', 'blue', 'white', 'red'] as TeeColor[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTeeColor(t)}
                      className={`py-3 rounded-xl border font-ui text-sm font-medium transition-colors capitalize
                        ${teeColor === t
                          ? 'border-sand bg-sand/20 text-sand'
                          : 'border-white/10 text-chalk/50'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={beginRound} disabled={saving} className="w-full" size="lg">
                {saving ? 'Creating round…' : 'Tee It Up →'}
              </Button>
            </div>
          )}
        </Card>

        {/* Recent rounds */}
        <div>
          <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest mb-3">Round History</p>
          {isLoading && <SkeletonCard />}
          {rounds?.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2"
            >
              <Card className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-ui text-chalk font-medium text-sm">
                    {(r as unknown as { course?: { name?: string } }).course?.name ?? 'Unknown'}
                  </p>
                  <p className="font-ui text-chalk/40 text-xs">
                    {new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' · '}{r.tee_color} tees
                  </p>
                </div>
                <p className="font-mono text-chalk text-2xl font-bold">{r.total_score || '—'}</p>
              </Card>
            </motion.div>
          ))}
          {!isLoading && !rounds?.length && (
            <p className="font-ui text-chalk/30 text-sm text-center py-6">No rounds yet — go play!</p>
          )}
        </div>
      </div>
    </SafeArea>
  )
}
