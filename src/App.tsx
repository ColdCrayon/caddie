import { Suspense, lazy, useEffect, useState, Component, type ReactNode } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BottomNav } from './components/layout/BottomNav'
import { useUserStore } from './stores/userStore'
import { supabase } from './lib/supabase'
import type { User } from './types'

const Auth = lazy(() => import('./pages/Auth'))
const Home = lazy(() => import('./pages/Home'))
const Round = lazy(() => import('./pages/Round'))
const RoundActive = lazy(() => import('./pages/RoundActive'))
const RoundDetail = lazy(() => import('./pages/RoundDetail'))
const Stats = lazy(() => import('./pages/Stats'))
const Swing = lazy(() => import('./pages/Swing'))
const League = lazy(() => import('./pages/League'))
const CourseScout = lazy(() => import('./pages/CourseScout'))
const Insights = lazy(() => import('./pages/Insights'))
const Settings = lazy(() => import('./pages/Settings'))
const Join = lazy(() => import('./pages/Join'))

const SHOW_NAV_ROUTES = ['/', '/round', '/stats', '/swing', '/league', '/insights', '/settings']

// ── Error boundary ──────────────────────────────────────────────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error
      return (
        <div className="min-h-screen bg-fairway flex flex-col items-center justify-center p-6 gap-4">
          <div className="text-4xl">⛳</div>
          <p className="font-display text-chalk text-lg font-semibold text-center">Something went wrong</p>
          <pre className="bg-ink/80 text-bogey text-xs p-4 rounded-xl max-w-sm w-full overflow-auto whitespace-pre-wrap break-all">
            {err.message}{'\n'}{err.stack?.split('\n').slice(1, 4).join('\n')}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="font-ui text-sand text-sm underline"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.state.error ? null : this.props.children
  }
}

// ── Env / connection diagnostics ────────────────────────────────────────────
function EnvError() {
  return (
    <div className="min-h-screen bg-fairway flex flex-col items-center justify-center p-6 gap-4">
      <div className="text-4xl">⚠️</div>
      <p className="font-display text-chalk text-lg font-semibold text-center">Configuration missing</p>
      <p className="font-ui text-chalk/60 text-sm text-center max-w-xs">
        Supabase environment variables are not set. Add{' '}
        <code className="text-sand">VITE_SUPABASE_URL</code> and{' '}
        <code className="text-sand">VITE_SUPABASE_ANON_KEY</code> in your Vercel project settings, then redeploy.
      </p>
    </div>
  )
}

function ConnectionError({ url, detail }: { url: string; detail: string }) {
  // Show only the project ref (safe to display — not a secret)
  const projectRef = url.replace('https://', '').split('.')[0] ?? url
  return (
    <div className="min-h-screen bg-fairway flex flex-col items-center justify-center p-6 gap-4">
      <div className="text-4xl">🔌</div>
      <p className="font-display text-chalk text-lg font-semibold text-center">
        Cannot reach Supabase
      </p>
      <div className="bg-ink/80 rounded-xl p-4 max-w-sm w-full space-y-2 text-xs font-mono">
        <div className="flex gap-2">
          <span className="text-chalk/40 shrink-0">Project ref</span>
          <span className="text-sand break-all">{projectRef}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-chalk/40 shrink-0">Error</span>
          <span className="text-bogey break-all">{detail}</span>
        </div>
      </div>
      <div className="max-w-xs space-y-1 text-xs font-ui text-chalk/50 text-center">
        <p>Check that <span className="text-sand">VITE_SUPABASE_URL</span> matches your Supabase project URL exactly (e.g. <span className="text-chalk/70">https://abcxyz.supabase.co</span>).</p>
        <p className="pt-1">If the project ref above looks wrong, update the env var in Vercel → Settings → Environment Variables and redeploy.</p>
        <p className="pt-1">Free Supabase projects pause after 7 days — <a href="https://supabase.com/dashboard" className="text-sand underline" target="_blank" rel="noreferrer">resume it here</a>.</p>
      </div>
      <button onClick={() => window.location.reload()} className="font-ui text-sand text-sm underline">
        Retry
      </button>
    </div>
  )
}

function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-fairway flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-5xl">⛳</div>
        <div className="w-6 h-6 border-2 border-sand border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const { user, setUser } = useUserStore()
  const [authLoading, setAuthLoading] = useState(true)
  const [safariHint, setSafariHint] = useState(false)
  const [connError, setConnError] = useState<string | null>(null)

  // Guard: show a visible error if env vars are missing instead of hanging
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!supabaseUrl || !supabaseKey) {
    return <EnvError />
  }

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        // A non-null error here means the key or URL is wrong / project is paused
        if (error) {
          setConnError(error.message)
          setAuthLoading(false)
          return
        }

        if (!session?.user) {
          // No session — unblock immediately so the auth route can render
          setAuthLoading(false)
          return
        }

        // Session exists — fetch or create profile, THEN unblock
        const loadProfile = async () => {
          try {
            const { data } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (data) {
              setUser(data as User)
            } else {
              const profile: User = {
                id: session.user.id,
                email: session.user.email ?? '',
                display_name:
                  session.user.user_metadata?.display_name ??
                  session.user.email?.split('@')[0] ??
                  'Golfer',
                handicap_index: null,
                home_course_id: null,
                created_at: new Date().toISOString(),
              }
              await supabase.from('users').insert(profile)
              setUser(profile)
            }
          } catch {
            // Profile fetch/create failed — still unblock so the user can try auth
          } finally {
            setAuthLoading(false)
          }
        }
        loadProfile()
      })
      .catch((err: unknown) => {
        // getSession itself threw (network/config issue) — surface the error visibly
        const msg = err instanceof Error ? err.message : String(err)
        setConnError(msg)
        setAuthLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setUser(null)
    })

    // Safari install hint
    const ua = navigator.userAgent
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua)
    const isIOS = /iPhone|iPad|iPod/.test(ua)
    const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone
    if (isSafari && isIOS && !isStandalone && !localStorage.getItem('safari-hint-dismissed')) {
      setSafariHint(true)
    }

    return () => subscription.unsubscribe()
  }, [setUser])

  const showNav =
    SHOW_NAV_ROUTES.some((r) =>
      r === '/' ? location.pathname === '/' : location.pathname.startsWith(r)
    ) && !!user

  if (authLoading) return <LoadingScreen />
  if (connError) return <ConnectionError url={supabaseUrl} detail={connError} />

  return (
    <ErrorBoundary>
      <div className="max-w-[430px] mx-auto bg-ink min-h-screen">
        {safariHint && (
          <div
            className="fixed top-0 left-0 right-0 z-50 max-w-[430px] mx-auto bg-sand/95 px-4 py-3 flex items-center gap-2"
            style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
          >
            <span className="text-ink text-xs font-ui flex-1">
              Tap <strong>Share</strong> (↑) then <strong>"Add to Home Screen"</strong> to install Caddie
            </span>
            <button
              onClick={() => {
                setSafariHint(false)
                localStorage.setItem('safari-hint-dismissed', '1')
              }}
              className="text-ink/70 font-bold text-xl leading-none ml-2"
            >
              ×
            </button>
          </div>
        )}

        <Suspense fallback={<LoadingScreen />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route
                path="/auth"
                element={user ? <Navigate to="/" replace /> : <PageTransition><Auth /></PageTransition>}
              />
              <Route path="/join/:token" element={<PageTransition><Join /></PageTransition>} />

              {!user ? (
                <Route path="*" element={<Navigate to="/auth" replace />} />
              ) : (
                <>
                  <Route path="/" element={<PageTransition><Home /></PageTransition>} />
                  <Route path="/round" element={<PageTransition><Round /></PageTransition>} />
                  <Route path="/round/active" element={<RoundActive />} />
                  <Route path="/round/:id" element={<PageTransition><RoundDetail /></PageTransition>} />
                  <Route path="/stats" element={<PageTransition><Stats /></PageTransition>} />
                  <Route path="/swing" element={<PageTransition><Swing /></PageTransition>} />
                  <Route path="/league" element={<PageTransition><League /></PageTransition>} />
                  <Route path="/course/:id/scout" element={<PageTransition><CourseScout /></PageTransition>} />
                  <Route path="/insights" element={<PageTransition><Insights /></PageTransition>} />
                  <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </>
              )}
            </Routes>
          </AnimatePresence>
        </Suspense>

        {showNav && <BottomNav />}
      </div>
    </ErrorBoundary>
  )
}
