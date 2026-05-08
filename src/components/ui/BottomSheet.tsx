import { type ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragYRef = useRef(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      dragYRef.current = 0
      setDragY(0)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Drag handle — always swipes to close
  useEffect(() => {
    const el = handleRef.current
    if (!el) return
    let startY = 0

    const onStart = (e: TouchEvent) => { startY = e.touches[0].clientY; setDragging(true) }
    const onMove = (e: TouchEvent) => {
      const delta = Math.max(0, e.touches[0].clientY - startY)
      dragYRef.current = delta
      setDragY(delta)
    }
    const onEnd = () => {
      setDragging(false)
      if (dragYRef.current > 80) { onClose(); dragYRef.current = 0; setDragY(0) }
      else { dragYRef.current = 0; setDragY(0) }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [onClose])

  // Content area — swipes to close only when scrolled to top
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    let startY = 0
    let swiping = false

    const onStart = (e: TouchEvent) => { startY = e.touches[0].clientY; swiping = false }
    const onMove = (e: TouchEvent) => {
      const scrollTop = el.scrollTop
      const delta = e.touches[0].clientY - startY
      if (!swiping && scrollTop === 0 && delta > 8) { swiping = true; setDragging(true) }
      if (swiping) {
        e.preventDefault()
        const y = Math.max(0, delta)
        dragYRef.current = y
        setDragY(y)
      }
    }
    const onEnd = () => {
      if (!swiping) return
      swiping = false
      setDragging(false)
      if (dragYRef.current > 80) { onClose(); dragYRef.current = 0; setDragY(0) }
      else { dragYRef.current = 0; setDragY(0) }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [onClose])

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
          transform: open ? `translateY(${dragY}px)` : 'translateY(105%)',
          transition: dragging ? 'none' : open
            ? 'transform 0.42s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            : 'transform 0.30s cubic-bezier(0.55, 0, 1, 0.45)',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.45)',
          willChange: 'transform',
        }}
      >
        {/* Drag handle */}
        <div
          ref={handleRef}
          style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px', cursor: 'grab', touchAction: 'none' }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(138,158,138,0.35)' }} />
        </div>

        {title && (
          <div style={{ padding: '4px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontFamily: "'Instrument Serif', serif", color: '#EDE9DF', fontSize: 20, margin: 0 }}>
              {title}
            </p>
          </div>
        )}

        <div
          ref={contentRef}
          style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: '82vh', width: '100%' }}
          className="scrollbar-hide"
        >
          {children}
        </div>
      </div>
    </>,
    document.body
  )
}
