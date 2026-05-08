import { type ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const touchStartY = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [dragY, setDragY] = useState(0)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Reset drag when sheet opens/closes
  useEffect(() => {
    if (!open) setDragY(0)
  }, [open])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    setDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) setDragY(delta)
  }

  const handleTouchEnd = () => {
    setDragging(false)
    if (dragY > 60) {
      setDragY(0)
      onClose()
    } else {
      setDragY(0)
    }
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(14,22,14,0.75)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto rounded-t-3xl border-t border-white/8
          ${open ? 'sheet-enter' : ''}
        `}
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, #1B2F1B 0%, #161F16 100%)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          transform: open
            ? `translateY(${dragY}px)`
            : 'translateY(100%)',
          transition: dragging ? 'none' : 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div
            className="rounded-full transition-colors"
            style={{ width: 36, height: 4, background: 'rgba(138,158,138,0.4)' }}
          />
        </div>

        {title && (
          <div className="px-5 pb-3 pt-1 border-b border-white/5">
            <h2 className="font-serif text-chalk text-xl">{title}</h2>
          </div>
        )}

        <div className="overflow-y-auto max-h-[80vh] scrollbar-hide">
          {children}
        </div>
      </div>
    </>,
    document.body
  )
}
