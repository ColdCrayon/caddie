import { supabase } from './supabase'

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return { Authorization: `Bearer ${session.access_token}` }
}

export async function fetchAIAdvice(payload: Record<string, unknown>): Promise<string> {
  const headers = await getAuthHeader()
  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ type: 'shot_advice', payload }),
  })
  if (!res.ok) throw new Error('AI proxy error')
  return res.text()
}

export async function streamAIAdvice(
  payload: Record<string, unknown>,
  onChunk: (text: string) => void
): Promise<void> {
  const headers = await getAuthHeader()
  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ type: 'shot_advice', payload }),
  })
  if (!res.ok || !res.body) throw new Error('AI proxy error')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    onChunk(decoder.decode(value, { stream: true }))
  }
}

export async function fetchSwingAnalysis(frames: string[], club: string): Promise<string> {
  const headers = await getAuthHeader()
  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ type: 'swing_analysis', payload: { frames, club } }),
  })
  if (!res.ok) throw new Error('AI proxy error')
  return res.text()
}

export async function fetchCourseScout(
  holes: { number: number; par: number; yardage: number }[]
): Promise<string> {
  const headers = await getAuthHeader()
  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ type: 'course_scout', payload: { holes } }),
  })
  if (!res.ok) throw new Error('AI proxy error')
  return res.text()
}

export async function fetchWeeklyDigest(data: Record<string, unknown>): Promise<string> {
  const headers = await getAuthHeader()
  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ type: 'weekly_digest', payload: data }),
  })
  if (!res.ok) throw new Error('AI proxy error')
  return res.text()
}

export async function streamAIRequest(
  type: string,
  payload: Record<string, unknown>,
  onChunk: (text: string) => void
): Promise<void> {
  const headers = await getAuthHeader()
  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ type, payload }),
  })
  if (!res.ok || !res.body) throw new Error('AI proxy error')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    onChunk(decoder.decode(value, { stream: true }))
  }
}

export async function fetchShotReaction(payload: Record<string, unknown>): Promise<string> {
  const headers = await getAuthHeader()
  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ type: 'shot_reaction', payload }),
  })
  if (!res.ok) throw new Error('AI proxy error')
  return res.text()
}
