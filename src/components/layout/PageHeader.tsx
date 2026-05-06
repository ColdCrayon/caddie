import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  subtitle?: string
  back?: boolean
  right?: ReactNode
}

export function PageHeader({ title, subtitle, back, right }: PageHeaderProps) {
  const navigate = useNavigate()
  return (
    <header
      className="sticky top-0 z-20 bg-fairway/95 backdrop-blur-xl border-b border-white/5 px-4 py-3"
      style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
    >
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={() => navigate(-1)}
            className="text-chalk/60 hover:text-chalk text-2xl min-w-[44px] min-h-[44px] flex items-center"
          >
            ‹
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-chalk text-xl font-semibold leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="font-ui text-chalk/50 text-xs mt-0.5">{subtitle}</p>
          )}
        </div>
        {right && <div className="flex-shrink-0">{right}</div>}
      </div>
    </header>
  )
}
