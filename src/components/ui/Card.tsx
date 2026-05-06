import { type HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  lifted?: boolean
}

export function Card({ className, lifted = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-rough rounded-2xl border-t border-white/[0.06]',
        lifted ? 'shadow-card-lg' : 'shadow-card',
        className
      )}
      {...props}
    />
  )
}
