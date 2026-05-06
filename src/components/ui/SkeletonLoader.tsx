import { type HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string
  height?: string
}

export function Skeleton({ className, width, height, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gradient-to-r from-rough via-white/5 to-rough bg-[length:200%_100%] animate-shimmer rounded-lg',
        className
      )}
      style={{ width, height }}
      {...props}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-rough rounded-2xl p-4 shadow-card space-y-3">
      <Skeleton height="24px" width="60%" />
      <Skeleton height="48px" width="40%" />
      <div className="flex gap-2">
        <Skeleton height="32px" className="flex-1" />
        <Skeleton height="32px" className="flex-1" />
      </div>
    </div>
  )
}
