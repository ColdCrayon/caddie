import { NavLink } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
  icon: string
}

const items: NavItem[] = [
  { to: '/', label: 'Home', icon: '⛳' },
  { to: '/round', label: 'Round', icon: '🏌️' },
  { to: '/stats', label: 'Stats', icon: '📊' },
  { to: '/swing', label: 'Swing', icon: '🎥' },
  { to: '/league', label: 'League', icon: '🏆' },
]

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-ink/95 backdrop-blur-xl border-t border-white/10 max-w-[430px] mx-auto"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex justify-around py-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 min-w-[44px] min-h-[44px] justify-center
               transition-colors font-ui text-[10px] leading-none
               ${isActive ? 'text-sand' : 'text-chalk/40'}`
            }
          >
            {({ isActive }) => (
              <>
                <span className="text-xl">{item.icon}</span>
                <span className={`${isActive ? 'text-sand' : 'text-chalk/40'}`}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
