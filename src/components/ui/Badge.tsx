import { type HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type BadgeVariant = 'default' | 'birdie' | 'bogey' | 'eagle' | 'warning' | 'offline'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-white/10 text-chalk',
    birdie: 'bg-birdie/20 text-birdie',
    bogey: 'bg-bogey/20 text-bogey',
    eagle: 'bg-eagle/20 text-eagle',
    warning: 'bg-sand/20 text-sand',
    offline: 'bg-bogey/10 text-bogey border border-bogey/20',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-ui font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
