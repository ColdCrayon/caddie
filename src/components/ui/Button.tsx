import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const base = 'font-ui font-medium rounded-lg transition-all active:scale-95 select-none'
    const variants = {
      primary: `
        bg-gradient-to-b from-sand to-[#b8944e]
        text-ink shadow-glow
        after:absolute after:inset-0 after:rounded-lg
        after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent
        after:translate-x-[-100%] active:after:translate-x-[100%]
        after:transition-transform after:duration-500
        relative overflow-hidden
      `,
      secondary: 'bg-rough text-chalk border border-white/10 hover:bg-rough/80',
      ghost: 'text-chalk/70 hover:text-chalk hover:bg-white/5',
      danger: 'bg-bogey/20 text-bogey border border-bogey/30 hover:bg-bogey/30',
    }
    const sizes = {
      sm: 'text-xs px-3 py-2 min-h-[36px]',
      md: 'text-sm px-4 py-2.5 min-h-[44px]',
      lg: 'text-base px-6 py-3 min-h-[52px]',
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
