import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const base =
      'font-ui font-semibold uppercase tracking-wider transition-all duration-150 ' +
      'active:scale-[0.96] select-none cursor-pointer disabled:opacity-40 ' +
      'disabled:pointer-events-none focus:outline-none focus-visible:ring-2 ' +
      'focus-visible:ring-sand/60'
    const variants = {
      primary:   'bg-sand text-ink hover:bg-sandlight shadow-glow-sm',
      secondary: 'bg-deeprough text-chalk border border-white/10 hover:border-sand/30 hover:text-sand',
      ghost:     'text-fog hover:text-chalk hover:bg-white/5',
      danger:    'bg-bogey/20 text-bogey border border-bogey/30 hover:bg-bogey/30',
    }
    const sizes = {
      sm: 'text-xs px-3 py-2 min-h-[36px] rounded',
      md: 'text-sm px-4 py-2.5 min-h-[44px] rounded',
      lg: 'text-sm px-6 py-3 min-h-[52px] rounded',
    }
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
