import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
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

type Step = 'search' | 'api-results' | 'api-loading' | 'tee-select' | 'hole-entry'
type MapsStatus = 'idle' | 'loading' | 'ready' | 'error' | 'no-key'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlacesLib = any

// Transformed course from the course-search Edge Function
interface ApiCourseResult {
  api_id: number
  name: string
  location: string
  lat: number
  lng: number
  available_tees: TeeColor[]
  tees: Record<string, {
    slope: number
    rating: number
    yards: number
    holes: { number: number; par: number; yardage: number }[]
  }>
}

function BackToSearch({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-1.5 font-ui text-xs text-chalk/40 hover:text-chalk/70 transition-colors cursor-pointer"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      Change course
    </button>
  )
}

function buildHolesFromApi(apiCourse: ApiCourseResult): HoleData[] {
  return Array.from({ length: 18 }, (_, i) => {
    const yardage = { black: 0, blue: 0, white: 0, red: 0 }
    for (const [color, teeData] of Object.entries(apiCourse.tees)) {
      const h = teeData.holes[i]
      if (h && (color === 'black' || color === 'blue' || color === 'white' || color === 'red')) {
        yardage[color as TeeColor] = h.yardage
      }
    }
    // Par should be the same across all tees; pick from first available
    const firstTee = Object.values(apiCourse.tees)[0]
    const par = firstTee?.holes[i]?.par ?? 4
    return { number: i + 1, par, yardage }
  })
}

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
  const [holeCount, setHoleCount] = useState<9 | 18>(18)
  const [holeStart, setHoleStart] = useState<0 | 9>(0)
  const [saving, setSaving] = useState(false)
  const [mapsStatus, setMapsStatus] = useState<MapsStatus>(() => GOOGLE_MAPS_KEY ? 'idle' : 'no-key')
  const [mapsError, setMapsError] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Golf API state
  const [apiResults, setApiResults] = useState<ApiCourseResult[]>([])
  const [pendingPlaceInfo, setPendingPlaceInfo] = useState<{
    name: string; location: string; placeId: string | null; lat: number | null; lng: number | null
  } | null>(null)

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
    if (!value.trim() || !placesLibRef.current) { setSuggestions([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const { suggestions: results } =
          await placesLibRef.current.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: value,
            sessionToken: sessionTokenRef.current,
            includedPrimaryTypes: ['golf_course'],
          })
        setSuggestions(results ?? [])
        setShowSuggestions(true)
      } catch (e) { console.error('Autocomplete error:', e) }
    }, 300)
  }, [])

  const handleSuggestionSelect = useCallback(async (suggestion: PlacesLib) => {
    setShowSuggestions(false)
    setSuggestions([])

    const place = suggestion.placePrediction.toPlace()
    await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location'] })
    if (placesLibRef.current) {
      sessionTokenRef.current = new placesLibRef.current.AutocompleteSessionToken()
    }

    const name: string = place.displayName ?? 'Unknown Course'
    setCourseInput(name)

    // 1. Check Supabase cache first (saves an API call)
    const { data: existing } = await supabase
      .from('courses').select('*').eq('google_place_id', place.id).single()
    if (existing) {
      setSelectedCourse(existing as Course)
      setStep('tee-select')
      return
    }

    // 2. Search Golf Course API
    setStep('api-loading')
    const placeInfo = {
      name,
      location: place.formattedAddress ?? '',
      placeId: place.id ?? null,
      lat: place.location?.lat() ?? null,
      lng: place.location?.lng() ?? null,
    }
    setPendingPlaceInfo(placeInfo)

    try {
      const { data, error } = await supabase.functions.invoke<{ courses: ApiCourseResult[] }>(
        'course-search',
        { body: { query: name } }
      )
      if (!error && data?.courses && data.courses.length > 0) {
        setApiResults(data.courses)
        setStep('api-results')
      } else {
        fallbackToManual(name, placeInfo)
      }
    } catch {
      fallbackToManual(name, placeInfo)
    }
  }, [])

  const fallbackToManual = (name: string, placeInfo: typeof pendingPlaceInfo) => {
    const blanks: HoleData[] = Array.from({ length: 18 }, (_, i) => ({
      number: i + 1, par: 4, yardage: { black: 0, blue: 0, white: 0, red: 0 },
    }))
    setHoleData(blanks)
    setSelectedCourse({
      id: '', created_at: '', name,
      location: placeInfo?.location ?? '',
      google_place_id: placeInfo?.placeId ?? null,
      lat: placeInfo?.lat ?? null,
      lng: placeInfo?.lng ?? null,
      holes: blanks,
      tee_options: ['black', 'blue', 'white', 'red'],
    } as unknown as Course)
    setStep('hole-entry')
  }

  // Unique recent courses derived from round history
  const recentCourses = useMemo(() => {
    if (!rounds) return []
    const seen = new Set<string>()
    return rounds
      .filter((r) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cid = (r as any).course_id as string | undefined
        if (!cid || seen.has(cid)) return false
        seen.add(cid)
        return true
      })
      .slice(0, 3)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => ({ id: r.course_id as string, name: r.course?.name ?? 'Unknown', location: r.course?.location ?? '' }))
  }, [rounds])

  const quickStart = useCallback(async (courseId: string) => {
    setSaving(true)
    try {
      const { data, error } = await supabase.from('courses').select('*').eq('id', courseId).single()
      if (error) throw error
      setSelectedCourse(data as Course)
      const teePreference: TeeColor[] = ['white', 'blue', 'black', 'red']
      const available = (data.tee_options ?? ['white']) as TeeColor[]
      const preferred = teePreference.find((t) => available.includes(t)) ?? available[0]
      if (preferred) setTeeColor(preferred)
      setStep('tee-select')
    } catch (e) { console.error(e) }
    setSaving(false)
  }, [])

  const handleManualSubmit = () => {
    if (!courseInput.trim()) return
    const blanks: HoleData[] = Array.from({ length: 18 }, (_, i) => ({
      number: i + 1, par: 4, yardage: { black: 0, blue: 0, white: 0, red: 0 },
    }))
    setHoleData(blanks)
    setSelectedCourse({
      id: '', created_at: '', name: courseInput.trim(),
      location: '', google_place_id: null, lat: null, lng: null,
      holes: blanks, tee_options: ['black', 'blue', 'white', 'red'],
    } as unknown as Course)
    setStep('hole-entry')
  }

  const selectApiCourse = async (apiCourse: ApiCourseResult) => {
    setSaving(true)
    try {
      const holes = buildHolesFromApi(apiCourse)
      const slopeRating: Record<string, number> = {}
      const courseRating: Record<string, number> = {}
      for (const [color, t] of Object.entries(apiCourse.tees)) {
        slopeRating[color] = t.slope
        courseRating[color] = t.rating
      }

      const { data: saved, error } = await supabase
        .from('courses')
        .insert({
          name: apiCourse.name,
          location: apiCourse.location,
          google_place_id: pendingPlaceInfo?.placeId ?? null,
          lat: apiCourse.lat || pendingPlaceInfo?.lat || null,
          lng: apiCourse.lng || pendingPlaceInfo?.lng || null,
          holes,
          tee_options: apiCourse.available_tees,
          slope_rating: slopeRating,
          course_rating: courseRating,
          api_course_id: apiCourse.api_id,
        })
        .select()
        .single()
      if (error) throw error
      setSelectedCourse(saved as Course)

      // Default tee to the "middle" option
      const teePreference: TeeColor[] = ['white', 'blue', 'black', 'red']
      const available = apiCourse.available_tees
      const preferred = teePreference.find((t) => available.includes(t)) ?? available[0]
      if (preferred) setTeeColor(preferred)

      setStep('tee-select')
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
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
          .select().single()
        if (error) throw error
        course = data as Course
      }
      setSelectedCourse(course)
      setStep('tee-select')
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const beginRound = async () => {
    if (!selectedCourse || !user) return
    setSaving(true)
    try {
      const { data: round, error } = await supabase
        .from('rounds')
        .insert({
          user_id: user.id, course_id: selectedCourse.id,
          date: new Date().toISOString(), tee_color: teeColor,
          completed: false, total_score: 0, notes: '',
        })
        .select().single()
      if (error) throw error

      const allHoles = selectedCourse.holes ?? holeData
      const teeHoles = allHoles.slice(holeStart, holeStart + holeCount).map((h) => ({
        par: h.par,
        yardage: h.yardage[teeColor] || h.yardage.white || 400,
        greenCenterLat: h.green_center_lat ?? null,
        greenCenterLng: h.green_center_lng ?? null,
        greenFrontLat: h.green_front_lat ?? null,
        greenFrontLng: h.green_front_lng ?? null,
        greenBackLat: h.green_back_lat ?? null,
        greenBackLng: h.green_back_lng ?? null,
      }))

      startRound({
        roundId: round.id,
        courseId: selectedCourse.id,
        courseName: selectedCourse.name,
        courseLat: selectedCourse.lat,
        courseLng: selectedCourse.lng,
        teeColor,
        holes: teeHoles,
      })

      navigate('/round/active')
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const availableTees = selectedCourse?.tee_options as TeeColor[] | undefined

  return (
    <SafeArea>
      <PageHeader title="Round" subtitle="Start or review your rounds" />
      <div className="px-4 py-4 space-y-4">
        <Card className="p-5 space-y-4">
          <h2 className="font-display text-chalk text-lg font-semibold">New Round</h2>

          {/* ── Search ── */}
          {step === 'search' && (
            <div className="space-y-3">
              {!manualMode ? (
                <>
                  {/* Recent courses quick start */}
                  {recentCourses.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest">Play Again</p>
                      {recentCourses.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => quickStart(c.id)}
                          disabled={saving}
                          className="w-full text-left p-3 rounded-xl border border-white/10 bg-rough/30
                                     active:scale-[0.98] transition-all cursor-pointer"
                          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-ui text-chalk text-sm font-medium">{c.name}</p>
                              {c.location && <p className="font-ui text-chalk/40 text-xs mt-0.5 truncate max-w-[220px]">{c.location}</p>}
                            </div>
                            <span className="font-ui text-sand text-xs font-semibold uppercase tracking-wider flex-shrink-0 ml-2">
                              {saving ? '…' : 'Tee up →'}
                            </span>
                          </div>
                        </button>
                      ))}
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                    </div>
                  )}

                  <p className="font-ui text-chalk/50 text-sm">Search for your course</p>
                  <div className="relative">
                    <input
                      type="text"
                      value={courseInput}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      placeholder="Pebble Beach, Augusta…"
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
                            <div className="text-chalk">{s.placePrediction?.mainText?.toString() ?? ''}</div>
                            <div className="text-chalk/40 text-xs mt-0.5">{s.placePrediction?.secondaryText?.toString() ?? ''}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {mapsStatus === 'no-key' && (
                    <div className="bg-ink/60 rounded-xl p-3 space-y-2">
                      <p className="font-ui text-bogey text-xs">
                        Google Maps key not configured. Add <code className="text-sand">VITE_GOOGLE_MAPS_KEY</code> to your env vars.
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
                          ? 'Domain not whitelisted — add your URL in Google Cloud Console → Credentials → Maps key.'
                          : `Maps failed: ${mapsError}`}
                      </p>
                      <button onClick={() => setManualMode(true)} className="font-ui text-sand text-xs underline">
                        Enter manually →
                      </button>
                    </div>
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

          {/* ── API Loading ── */}
          {step === 'api-loading' && (
            <div className="space-y-4">
              <BackToSearch onBack={() => { setStep('search'); setCourseInput('') }} />
              <div className="py-6 flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-sand border-t-transparent rounded-full animate-spin" />
                <p className="font-ui text-chalk/50 text-sm">Looking up course data…</p>
              </div>
            </div>
          )}

          {/* ── API Results ── */}
          {step === 'api-results' && (
            <div className="space-y-3">
              <BackToSearch onBack={() => { setStep('search'); setCourseInput(''); setApiResults([]) }} />
              <p className="font-ui text-chalk/60 text-sm">
                Select your course — we've fetched the full scorecard automatically.
              </p>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {apiResults.map((c) => (
                  <button
                    key={c.api_id}
                    onClick={() => selectApiCourse(c)}
                    disabled={saving}
                    className="w-full text-left p-4 rounded-xl border border-white/10 bg-rough/30
                               hover:border-sand/30 hover:bg-sand/5 transition-colors"
                  >
                    <p className="font-ui text-chalk font-medium text-sm">{c.name}</p>
                    <p className="font-ui text-chalk/40 text-xs mt-0.5">{c.location}</p>
                    <div className="flex gap-1.5 mt-2">
                      {c.available_tees.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md text-xs font-ui font-medium capitalize"
                          style={{
                            background: t === 'black' ? '#111' : t === 'blue' ? '#1e3a5f' : t === 'white' ? '#e5e5e5' : '#5c1a1a',
                            color: t === 'white' ? '#111' : '#e5e5e5',
                          }}
                        >
                          {t}
                        </span>
                      ))}
                      {c.tees[c.available_tees[0]] && (
                        <span className="font-ui text-chalk/30 text-xs self-center ml-1">
                          {c.tees[c.available_tees[0]].yards.toLocaleString()} yds
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {saving && (
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-4 h-4 border-2 border-sand border-t-transparent rounded-full animate-spin" />
                  <p className="font-ui text-chalk/50 text-sm">Saving course…</p>
                </div>
              )}
              <button
                onClick={() => fallbackToManual(pendingPlaceInfo?.name ?? courseInput, pendingPlaceInfo)}
                className="font-ui text-chalk/30 text-xs underline w-full text-center"
              >
                Not listed? Enter scorecard manually
              </button>
            </div>
          )}

          {/* ── Manual Hole Entry ── */}
          {step === 'hole-entry' && (
            <div className="space-y-3">
              <BackToSearch onBack={() => { setStep('search'); setSelectedCourse(null); setCourseInput('') }} />
              <p className="font-display text-sand font-semibold">{selectedCourse?.name}</p>
              <p className="font-ui text-chalk/60 text-sm">
                Enter par and white tee yardage for each hole
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
                      placeholder="Yards"
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
                {saving ? 'Saving…' : 'Save & Continue'}
              </Button>
            </div>
          )}

          {/* ── Tee Select ── */}
          {step === 'tee-select' && selectedCourse && (
            <div className="space-y-4">
              <BackToSearch onBack={() => { setStep('search'); setSelectedCourse(null); setCourseInput('') }} />
              <p className="font-display text-sand font-semibold">{selectedCourse.name}</p>

              {/* Slope / rating info if available */}
              {selectedCourse.slope_rating && Object.keys(selectedCourse.slope_rating).length > 0 && (
                <div className="bg-ink/40 rounded-xl p-3">
                  <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest mb-2">Course Ratings</p>
                  <div className="grid grid-cols-2 gap-y-1">
                    {(availableTees ?? (['black', 'blue', 'white', 'red'] as TeeColor[])).map((t) => {
                      const slope = selectedCourse.slope_rating?.[t]
                      const rating = selectedCourse.course_rating?.[t]
                      if (!slope && !rating) return null
                      return (
                        <div key={t} className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: t === 'black' ? '#111' : t === 'blue' ? '#3b82f6' : t === 'white' ? '#e5e5e5' : '#ef4444' }}
                          />
                          <span className="font-ui text-chalk/60 text-xs capitalize">{t}</span>
                          {rating && <span className="font-mono text-chalk/80 text-xs">{rating}</span>}
                          {slope && <span className="font-ui text-chalk/40 text-xs">/ {slope}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="font-ui text-chalk/50 text-xs uppercase tracking-widest mb-2">Select Tee</p>
                <div className="grid grid-cols-2 gap-2">
                  {(availableTees ?? (['black', 'blue', 'white', 'red'] as TeeColor[])).map((t) => {
                    const teeYards = selectedCourse.holes[0]?.yardage[t]
                    const totalYards = selectedCourse.holes.reduce((s, h) => s + (h.yardage[t] ?? 0), 0)
                    return (
                      <button
                        key={t}
                        onClick={() => setTeeColor(t)}
                        className={`py-3 px-4 rounded-xl border font-ui text-sm font-medium transition-colors capitalize text-left
                          ${teeColor === t ? 'border-sand bg-sand/20 text-sand' : 'border-white/10 text-chalk/50'}`}
                      >
                        <span className="block">{t}</span>
                        {totalYards > 0 && (
                          <span className="font-mono text-xs opacity-60">{totalYards.toLocaleString()} yds</span>
                        )}
                        {!totalYards && teeYards === 0 && (
                          <span className="font-mono text-xs opacity-40">—</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* Holes toggle */}
              <div>
                <p className="font-ui text-chalk/50 text-xs uppercase tracking-widest mb-2">Holes</p>
                <div
                  className="flex rounded-lg overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(14,22,14,0.6)' }}
                >
                  {([
                    { label: '18 Holes', count: 18 as const, start: 0 as const },
                    { label: 'Front 9',  count: 9  as const, start: 0 as const },
                    { label: 'Back 9',   count: 9  as const, start: 9 as const },
                  ]).map(({ label, count, start }) => {
                    const active = holeCount === count && holeStart === start
                    return (
                      <button
                        key={label}
                        onClick={() => { setHoleCount(count); setHoleStart(start) }}
                        className="flex-1 py-2.5 font-ui text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                        style={{
                          background: active ? '#C9A96E' : 'transparent',
                          color: active ? '#0E160E' : 'rgba(138,158,138,0.7)',
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <Button onClick={beginRound} disabled={saving} className="w-full" size="lg">
                {saving ? 'Creating round…' : 'Tee It Up →'}
              </Button>
            </div>
          )}
        </Card>

        {/* Round history */}
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
