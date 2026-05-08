import Anthropic from 'npm:@anthropic-ai/sdk@0.27.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { type, payload } = await req.json()
    const anthropicKey = Deno.env.get('ANTHROPIC_KEY')
    if (!anthropicKey) throw new Error('ANTHROPIC_KEY not set')

    const client = new Anthropic({ apiKey: anthropicKey })
    const MODEL = 'claude-sonnet-4-6'

    if (type === 'shot_advice') {
      const { distance_to_pin, lie, wind_speed, wind_direction, elevation_change, hole_par, hole_number, selected_club } = payload

      const windDir = ['N','NE','E','SE','S','SW','W','NW'][Math.round(wind_direction / 45) % 8]
      const userPrompt = `Hole ${hole_number}, Par ${hole_par}. Distance to pin: ${distance_to_pin} yards. Lie: ${lie}. Wind: ${wind_speed} mph from ${windDir}. Elevation: ${elevation_change > 0 ? `+${elevation_change}` : elevation_change} ft. Selected club: ${selected_club}.`

      const stream = await client.messages.stream({
        model: MODEL,
        max_tokens: 150,
        system: `You are Angus, a weathered Scottish caddie with 30 years on tour. You give sharp, confident, occasionally dry-humored advice. You never waffle. You know the math but you speak like a human. Keep advice under 60 words unless the player asks for more.`,
        messages: [{ role: 'user', content: userPrompt }],
      })

      const encoder = new TextEncoder()
      const body = new ReadableStream({
        async start(controller) {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
          controller.close()
        },
      })

      return new Response(body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      })
    }

    if (type === 'shot_reaction') {
      const { result, club, distance } = payload
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 40,
        system: `You are Angus, a weathered Scottish caddie. Give a 1-sentence reaction to the shot result. Be dry, brief, human.`,
        messages: [{ role: 'user', content: `${club} from ${distance} yards: ${result}` }],
      })
      const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
      return new Response(text, { headers: { ...corsHeaders, 'Content-Type': 'text/plain' } })
    }

    if (type === 'swing_analysis') {
      const { biometrics, club, view } = payload
      const b = biometrics as Record<string, number>

      const userPrompt = `Swing measurements:
- Shoulder rotation at top of backswing: ${b.shoulderRotation}° (tour average: 90°)
- Hip rotation at top of backswing: ${b.hipRotation}° (tour average: 45°)
- X-factor (shoulder vs hip differential): ${b.xFactor}° (tour average: 45°)
- Lead arm angle at top: ${b.leadArmAngle}° (ideal: 85-95°)
- Spine tilt at address: ${b.spineTilt}° (ideal: 35-45° forward)
- Head lateral drift, address to impact: ${b.headDrift}% of frame (ideal: under 5%)
- Lead knee flex change, address to impact: ${b.kneeFlexChange}° (positive = straighter at impact; ideal: -5 to +10°)

Camera view: ${view}
Club: ${club}

Respond only in valid JSON:
{
  "summary": "2 sentence overall assessment",
  "metrics": [{"name": string, "value": string, "status": "good"|"watch"|"fix", "note": string}],
  "tips": [{"priority": 1|2|3, "fault": string, "drill": string}]
}`

      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: `You are a PGA-certified teaching professional analyzing a student's golf swing. You have been provided with precise biomechanical measurements extracted from video analysis software. Give specific, actionable coaching feedback based only on these measurements — do not speculate about anything not in the data. Always return exactly 7 metrics (one per measurement) and exactly 3 tips ordered by priority.`,
        messages: [{ role: 'user', content: userPrompt }],
      })

      const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      return new Response(jsonMatch ? jsonMatch[0] : text, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (type === 'course_scout') {
      const { holes } = payload
      const holeList = holes.map((h: { number: number; par: number; yardage: number }) =>
        `Hole ${h.number}: Par ${h.par}, ${h.yardage} yards`
      ).join('\n')

      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: `You are an experienced golf caddie with deep course knowledge. Give practical, specific advice.`,
        messages: [{
          role: 'user',
          content: `For each of these 18 holes, write a 1-2 sentence strategic tip for a mid-handicap amateur golfer. Focus on course management. Respond only in JSON: { "holes": [{"number": number, "tip": string}] }\n\n${holeList}`,
        }],
      })

      const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      return new Response(jsonMatch ? jsonMatch[0] : text, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (type === 'weekly_digest') {
      const { rounds } = payload
      const roundsSummary = rounds.map((r: { date: string; score: number; gir_pct: number; fir_pct: number; putts: number }) =>
        `${new Date(r.date).toLocaleDateString()}: Score ${r.score}, GIR ${r.gir_pct}%, FIR ${r.fir_pct}%, Putts ${r.putts}`
      ).join('\n')

      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 512,
        system: `You are an experienced golf coach reviewing a student's recent performance data. Write in a warm, direct coaching voice.`,
        messages: [{
          role: 'user',
          content: `Write a weekly improvement report based on this recent performance data. Include: a 2-3 sentence narrative summary, 3 specific focus areas with brief explanations, and 1 concrete drill or practice recommendation. Keep it under 200 words total.\n\n${roundsSummary}`,
        }],
      })

      const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
      return new Response(text, { headers: { ...corsHeaders, 'Content-Type': 'text/plain' } })
    }

    return new Response('Unknown type', { status: 400, headers: corsHeaders })
  } catch (err) {
    console.error(err)
    return new Response(String(err), { status: 500, headers: corsHeaders })
  }
})
