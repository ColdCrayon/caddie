import { type HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  lifted?: boolean
  deep?: boolean
}

export function Card({ className, lifted = false, deep = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        deep ? 'card-deep' : 'card-surface',
        'rounded-xl',
        lifted ? 'shadow-card-lg' : 'shadow-card',
        className
      )}
      {...props}
    />
  )
}
