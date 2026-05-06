import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const submit = async () => {
    setLoading(true)
    setError(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // No navigate() here — onAuthStateChange in App.tsx sets the user,
        // which triggers the /auth route guard to redirect to / automatically
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        })
        if (error) throw error
        setSuccess('Check your email to confirm your account, then sign in.')
        setMode('login')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-fairway bg-topo flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="text-6xl">⛳</div>
          <h1 className="font-display text-chalk text-4xl font-bold">Caddie</h1>
          <p className="font-ui text-chalk/50 text-sm">Your AI golf companion</p>
        </div>

        {/* Form */}
        <div className="bg-rough rounded-2xl p-6 shadow-card-lg border-t border-white/[0.06] space-y-4">
          <div className="flex rounded-xl overflow-hidden border border-white/10 mb-2">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 font-ui text-sm transition-colors
                  ${mode === m ? 'bg-sand/20 text-sand' : 'text-chalk/40'}`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-ink border border-white/10 rounded-xl px-4 py-3 font-ui text-chalk
                         placeholder:text-chalk/30 focus:outline-none focus:border-sand/50"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-ink border border-white/10 rounded-xl px-4 py-3 font-ui text-chalk
                       placeholder:text-chalk/30 focus:outline-none focus:border-sand/50"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="w-full bg-ink border border-white/10 rounded-xl px-4 py-3 font-ui text-chalk
                       placeholder:text-chalk/30 focus:outline-none focus:border-sand/50"
          />

          {error && <p className="font-ui text-bogey text-sm">{error}</p>}
          {success && <p className="font-ui text-birdie text-sm">{success}</p>}

          <Button onClick={submit} disabled={loading} className="w-full" size="lg">
            {loading ? '…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </div>
      </div>
    </div>
  )
}
