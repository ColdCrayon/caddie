import { Suspense, lazy, useEffect, useState } from 'react'
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

function PageTransition({ children }: { children: React.ReactNode }) {
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from('users').select('*').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data) {
              setUser(data as User)
            } else {
              const profile: User = {
                id: session.user.id,
                email: session.user.email ?? '',
                display_name: session.user.user_metadata?.display_name ?? session.user.email?.split('@')[0] ?? 'Golfer',
                handicap_index: null,
                home_course_id: null,
                created_at: new Date().toISOString(),
              }
              supabase.from('users').insert(profile).then(() => setUser(profile))
            }
          })
      }
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

  const showNav = SHOW_NAV_ROUTES.some((r) =>
    r === '/' ? location.pathname === '/' : location.pathname.startsWith(r)
  ) && !!user

  if (authLoading) return <LoadingScreen />

  return (
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
            onClick={() => { setSafariHint(false); localStorage.setItem('safari-hint-dismissed', '1') }}
            className="text-ink/70 font-bold text-xl leading-none ml-2"
          >
            ×
          </button>
        </div>
      )}

      <Suspense fallback={<LoadingScreen />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/auth" element={user ? <Navigate to="/" /> : <PageTransition><Auth /></PageTransition>} />
            <Route path="/join/:token" element={<PageTransition><Join /></PageTransition>} />

            {!user ? (
              <Route path="*" element={<Navigate to="/auth" />} />
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
                <Route path="*" element={<Navigate to="/" />} />
              </>
            )}
          </Routes>
        </AnimatePresence>
      </Suspense>

      {showNav && <BottomNav />}
    </div>
  )
}
