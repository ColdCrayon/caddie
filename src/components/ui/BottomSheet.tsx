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
    if (open) {
      document.body.style.overflow = 'hidden'
      setDragY(0)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
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
    if (dragY > 80) { onClose(); setDragY(0) }
    else setDragY(0)
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(14,22,14,0.72)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.28s ease',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 50,
          maxWidth: 430,
          margin: '0 auto',
          borderRadius: '20px 20px 0 0',
          background: 'linear-gradient(180deg, #1e3020 0%, #161f16 100%)',
          borderTop: '1px solid rgba(255,255,255,0.09)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          overflowX: 'hidden',
          // iOS-style spring: fast in, gentle settle
          transform: open ? `translateY(${dragY}px)` : 'translateY(105%)',
          transition: dragging
            ? 'none'
            : open
            ? 'transform 0.42s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            : 'transform 0.30s cubic-bezier(0.55, 0, 1, 0.45)',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.45)',
          willChange: 'transform',
        }}
      >
        {/* Drag handle — only touch here triggers dismiss */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px', cursor: 'grab' }}
        >
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: 'rgba(138,158,138,0.35)',
            transition: 'background 0.15s',
          }} />
        </div>

        {title && (
          <div style={{ padding: '4px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontFamily: "'Instrument Serif', serif", color: '#EDE9DF', fontSize: 20, margin: 0 }}>
              {title}
            </p>
          </div>
        )}

        {/* Scrollable content — no horizontal overflow */}
        <div style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: '82vh', width: '100%' }}
             className="scrollbar-hide">
          {children}
        </div>
      </div>
    </>,
    document.body
  )
}
