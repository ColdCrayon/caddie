import { NavLink } from 'react-router-dom'

// Minimal inline SVG icons — consistent 24×24 viewBox
const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
)
const FlagIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
    <line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
)
const ChartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)
const CameraIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)
const UsersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const items = [
  { to: '/',       label: 'Home',   Icon: HomeIcon,   end: true },
  { to: '/round',  label: 'Round',  Icon: FlagIcon,   end: false },
  { to: '/stats',  label: 'Stats',  Icon: ChartIcon,  end: false },
  { to: '/swing',  label: 'Swing',  Icon: CameraIcon, end: false },
  { to: '/league', label: 'League', Icon: UsersIcon,  end: false },
]

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 max-w-[430px] mx-auto"
      style={{
        background: '#161F16',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: 'calc(64px + env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex justify-around h-16">
        {items.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px]
               transition-all duration-200 cursor-pointer select-none
               ${isActive ? 'text-sand scale-[1.05]' : 'text-fog'}`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active top-line indicator */}
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-sm transition-all duration-200"
                  style={{
                    width: isActive ? '28px' : '0px',
                    height: '2px',
                    background: '#C9A96E',
                    opacity: isActive ? 1 : 0,
                  }}
                />
                <Icon />
                <span
                  className="font-ui font-semibold uppercase"
                  style={{ fontSize: '10px', letterSpacing: '0.1em' }}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
