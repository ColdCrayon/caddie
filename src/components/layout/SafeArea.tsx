import { type ReactNode } from 'react'

interface SafeAreaProps {
  children: ReactNode
  className?: string
}

export function SafeArea({ children, className = '' }: SafeAreaProps) {
  return (
    <main
      className={`max-w-[430px] mx-auto min-h-screen bg-fairway bg-topo ${className}`}
      style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}
    >
      {children}
    </main>
  )
}
