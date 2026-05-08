const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApiHole { par: number; yardage: number }
interface ApiTee {
  tee_name: string
  course_rating: number
  slope_rating: number
  total_yards: number
  par_total: number
  holes: ApiHole[]
}
interface ApiCourse {
  id: number
  club_name: string
  course_name: string
  location: { address: string; city: string; state: string; country: string; latitude: number; longitude: number }
  tees: { female?: ApiTee[]; male?: ApiTee[] }
}

type TeeColor = 'black' | 'blue' | 'white' | 'red'

function extractColor(teeName: string): TeeColor | null {
  const n = teeName.toLowerCase()
  if (n.includes('black') || n.includes('championship') || n.includes('tournament')) return 'black'
  if (n.includes('blue') || n.includes('cobalt')) return 'blue'
  if (n.includes('white') || n.includes('silver')) return 'white'
  if (n.includes('red') || n.includes('gold') || n.includes('yellow') || n.includes('women')) return 'red'
  return null
}

function transformCourse(c: ApiCourse) {
  const allTees: { tee: ApiTee; gender: 'male' | 'female' }[] = [
    ...(c.tees.male ?? []).map((t) => ({ tee: t, gender: 'male' as const })),
    ...(c.tees.female ?? []).map((t) => ({ tee: t, gender: 'female' as const })),
  ]

  type TeeData = { slope: number; rating: number; yards: number; holes: { number: number; par: number; yardage: number }[] }
  const teeMap: Partial<Record<TeeColor, TeeData>> = {}

  for (const { tee } of allTees) {
    const color = extractColor(tee.tee_name)
    if (!color) continue
    const existing = teeMap[color]
    if (existing) {
      // For black/blue prefer longer; for white/red prefer shorter
      if ((color === 'black' || color === 'blue') && tee.total_yards <= existing.yards) continue
      if ((color === 'white' || color === 'red') && tee.total_yards >= existing.yards) continue
    }
    teeMap[color] = {
      slope: tee.slope_rating,
      rating: tee.course_rating,
      yards: tee.total_yards,
      holes: tee.holes.map((h, i) => ({ number: i + 1, par: h.par, yardage: h.yardage })),
    }
  }

  // Fallback: assign by position if no color names found
  if (Object.keys(teeMap).length === 0) {
    const maleByYards = [...(c.tees.male ?? [])].sort((a, b) => b.total_yards - a.total_yards)
    const fallbackColors: TeeColor[] = ['black', 'blue', 'white']
    maleByYards.slice(0, 3).forEach((t, i) => {
      teeMap[fallbackColors[i]] = {
        slope: t.slope_rating, rating: t.course_rating, yards: t.total_yards,
        holes: t.holes.map((h, j) => ({ number: j + 1, par: h.par, yardage: h.yardage })),
      }
    })
    const ft = (c.tees.female ?? [])[0]
    if (ft) {
      teeMap['red'] = {
        slope: ft.slope_rating, rating: ft.course_rating, yards: ft.total_yards,
        holes: ft.holes.map((h, j) => ({ number: j + 1, par: h.par, yardage: h.yardage })),
      }
    }
  }

  return {
    api_id: c.id,
    name: c.course_name || c.club_name,
    location: [c.location.city, c.location.state, c.location.country].filter(Boolean).join(', '),
    lat: c.location.latitude,
    lng: c.location.longitude,
    available_tees: Object.keys(teeMap) as TeeColor[],
    tees: teeMap,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { query } = await req.json() as { query: string }
    if (!query?.trim()) {
      return new Response(JSON.stringify({ courses: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('GOLF_COURSE_API_KEY')
    if (!apiKey) throw new Error('GOLF_COURSE_API_KEY not set')

    const url = `https://api.golfcourseapi.com/v1/search?search_query=${encodeURIComponent(query)}`
    const res = await fetch(url, { headers: { Authorization: `Key ${apiKey}` } })
    if (!res.ok) throw new Error(`Golf API ${res.status}: ${await res.text()}`)

    const data = await res.json() as { courses: ApiCourse[] }
    const courses = (data.courses ?? []).slice(0, 8).map(transformCourse)

    return new Response(JSON.stringify({ courses }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err), courses: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
