import { useState, useRef, useEffect, useCallback } from 'react'
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

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined

type Step = 'search' | 'tee-select' | 'hole-entry'
type MapsStatus = 'idle' | 'loading' | 'ready' | 'error' | 'no-key'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlacesLib = any

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
  const [mapsStatus, setMapsStatus] = useState<MapsStatus>(() =>
    GOOGLE_MAPS_KEY ? 'idle' : 'no-key'
  )
  const [mapsError, setMapsError] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const placesLibRef = useRef<PlacesLib>(null)
  const sessionTokenRef = useRef<PlacesLib>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mapsInitialized = useRef(false)

  useEffect(() => {
    if (!GOOGLE_MAPS_KEY || mapsInitialized.current) return
    mapsInitialized.current = true
    setMapsStatus('loading')
    setOptions({ key: GOOGLE_MAPS_KEY, v: 'weekly' })
    import('@googlemaps/js-api-loader')
      .then(({ importLibrary }) => importLibrary('places'))
      .then((lib: PlacesLib) => {
        placesLibRef.current = lib
        sessionTokenRef.current = new lib.AutocompleteSessionToken()
        setMapsStatus('ready')
      })
      .catch((err: unknown) => {
        setMapsStatus('error')
        setMapsError(err instanceof Error ? err.message : String(err))
      })
  }, [])

  const handleInputChange = useCallback(async (value: string) => {
    setCourseInput(value)
    setShowSuggestions(false)
    if (!value.trim() || !placesLibRef.current) {
      setSuggestions([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const { suggestions: results } =
          await placesLibRef.current.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: value,
            sessionToken: sessionTokenRef.current,
          })
        setSuggestions(results ?? [])
        setShowSuggestions(true)
      } catch (e) {
        console.error('Autocomplete error:', e)
      }
    }, 300)
  }, [])

  const handleSuggestionSelect = useCallback(async (suggestion: PlacesLib) => {
    setShowSuggestions(false)
    setSuggestions([])

    const place = suggestion.placePrediction.toPlace()
    await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location'] })

    // Reset session token after a selection completes the session
    if (placesLibRef.current) {
      sessionTokenRef.current = new placesLibRef.current.AutocompleteSessionToken()
    }

    const name: string = place.displayName ?? 'Unknown Course'
    setCourseInput(name)

    const { data: existing } = await supabase
      .from('courses')
      .select('*')
      .eq('google_place_id', place.id)
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
      setSelectedCourse({
        id: '',
        created_at: '',
        name,
        location: place.formattedAddress ?? '',
        google_place_id: place.id ?? null,
        lat: place.location?.lat() ?? null,
        lng: place.location?.lng() ?? null,
        holes: blanks,
        tee_options: ['black', 'blue', 'white', 'red'],
      } as unknown as Course)
      setStep('hole-entry')
    }
  }, [])

  const handleManualSubmit = () => {
    if (!courseInput.trim()) return
    const blanks: HoleData[] = Array.from({ length: 18 }, (_, i) => ({
      number: i + 1,
      par: 4,
      yardage: { black: 0, blue: 0, white: 0, red: 0 },
    }))
    setHoleData(blanks)
    setSelectedCourse({
      id: '',
      created_at: '',
      name: courseInput.trim(),
      location: '',
      google_place_id: null,
      lat: null,
      lng: null,
      holes: blanks,
      tee_options: ['black', 'blue', 'white', 'red'],
    } as unknown as Course)
    setStep('hole-entry')
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
        <Card className="p-5 space-y-4">
          <h2 className="font-display text-chalk text-lg font-semibold">New Round</h2>

          {step === 'search' && (
            <div className="space-y-3">
              {!manualMode ? (
                <>
                  <p className="font-ui text-chalk/50 text-sm">Search for a course</p>
                  <div className="relative">
                    <input
                      type="text"
                      value={courseInput}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      placeholder="Augusta National…"
                      disabled={mapsStatus === 'loading'}
                      className="w-full bg-ink border border-white/10 rounded-xl px-4 py-3 font-ui text-chalk
                                 placeholder:text-chalk/30 focus:outline-none focus:border-sand/50 disabled:opacity-50"
                    />
                    {mapsStatus === 'loading' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-sand border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-rough border border-white/10 rounded-xl mt-1 z-50 overflow-hidden shadow-xl">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {suggestions.map((s: any, i: number) => (
                          <button
                            key={i}
                            onMouseDown={() => handleSuggestionSelect(s)}
                            className="w-full text-left px-4 py-3 font-ui text-sm hover:bg-sand/10
                                       border-b border-white/5 last:border-0 transition-colors"
                          >
                            <div className="text-chalk">
                              {s.placePrediction?.mainText?.toString() ?? ''}
                            </div>
                            <div className="text-chalk/40 text-xs mt-0.5">
                              {s.placePrediction?.secondaryText?.toString() ?? ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {mapsStatus === 'no-key' && (
                    <div className="bg-ink/60 rounded-xl p-3 space-y-2">
                      <p className="font-ui text-bogey text-xs">
                        Google Maps key not configured — add <code className="text-sand">VITE_GOOGLE_MAPS_KEY</code> to your env vars.
                      </p>
                      <button onClick={() => setManualMode(true)} className="font-ui text-sand text-xs underline">
                        Enter course name manually →
                      </button>
                    </div>
                  )}

                  {mapsStatus === 'error' && (
                    <div className="bg-ink/60 rounded-xl p-3 space-y-2">
                      <p className="font-ui text-bogey text-xs">
                        {mapsError?.includes('RefererNotAllowed')
                          ? 'Domain not whitelisted — add caddie-tan.vercel.app/* in Google Cloud Console → Credentials → your Maps key → Website restrictions.'
                          : `Maps failed to load: ${mapsError}`}
                      </p>
                      <button onClick={() => setManualMode(true)} className="font-ui text-sand text-xs underline">
                        Enter course name manually →
                      </button>
                    </div>
                  )}

                  {mapsStatus === 'ready' && !courseInput && (
                    <p className="font-ui text-chalk/30 text-xs">Type a course name to search</p>
                  )}

                  <button onClick={() => setManualMode(true)} className="font-ui text-chalk/30 text-xs underline">
                    Enter manually instead
                  </button>
                </>
              ) : (
                <>
                  <p className="font-ui text-chalk/50 text-sm">Enter course name</p>
                  <input
                    type="text"
                    value={courseInput}
                    onChange={(e) => setCourseInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                    placeholder="Augusta National…"
                    autoFocus
                    className="w-full bg-ink border border-white/10 rounded-xl px-4 py-3 font-ui text-chalk
                               placeholder:text-chalk/30 focus:outline-none focus:border-sand/50"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleManualSubmit} disabled={!courseInput.trim()} className="flex-1">
                      Continue →
                    </Button>
                    {GOOGLE_MAPS_KEY && mapsStatus !== 'error' && (
                      <button onClick={() => setManualMode(false)} className="font-ui text-chalk/40 text-sm px-3">
                        Search
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 'hole-entry' && (
            <div className="space-y-3">
              <p className="font-display text-sand font-semibold">{selectedCourse?.name}</p>
              <p className="font-ui text-chalk/60 text-sm">
                New course — enter par and white tee yardage for each hole
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
                        ${teeColor === t ? 'border-sand bg-sand/20 text-sand' : 'border-white/10 text-chalk/50'}`}
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
