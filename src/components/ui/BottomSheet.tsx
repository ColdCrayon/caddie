import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const dragging = useRef(false)
  const startY = useRef(0)

  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  // Slide in / slide out whenever open changes
  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return
    if (open) {
      sheet.style.transform = 'translateY(100%)'
      sheet.style.transition = 'none'
      // Double rAF: let the browser paint the initial position before animating
      requestAnimationFrame(() => requestAnimationFrame(() => {
        sheet.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)'
        sheet.style.transform = 'translateY(0)'
      }))
    } else {
      sheet.style.transition = 'transform 0.3s ease'
      sheet.style.transform = 'translateY(100%)'
    }
  }, [open])

  // Drag-to-dismiss — attached ONLY to the handle, so body scrolls freely
  useEffect(() => {
    const handle = handleRef.current
    const sheet = sheetRef.current
    if (!handle || !sheet) return

    const onStart = (e: TouchEvent | MouseEvent) => {
      dragging.current = true
      startY.current = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
      sheet.style.transition = 'none'
    }

    const onMove = (e: TouchEvent | MouseEvent) => {
      if (!dragging.current) return
      const y = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
      const delta = Math.max(0, y - startY.current)
      sheet.style.transform = `translateY(${delta}px)`
    }

    const onEnd = (e: TouchEvent | MouseEvent) => {
      if (!dragging.current) return
      dragging.current = false
      const y = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY
      const delta = y - startY.current
      sheet.style.transition = 'transform 0.3s ease'
      if (delta > 100) {
        sheet.style.transform = 'translateY(100%)'
        setTimeout(() => onCloseRef.current(), 300)
      } else {
        sheet.style.transform = 'translateY(0)'
      }
    }

    handle.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    handle.addEventListener('mousedown', onStart)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)

    return () => {
      handle.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      handle.removeEventListener('mousedown', onStart)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
    }
  }, [])

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 40,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.3s',
        opacity: open ? 1 : 0,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={() => onCloseRef.current()}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(14,22,14,0.72)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          position: 'relative', width: '100%', maxWidth: 430, zIndex: 50,
          borderRadius: '20px 20px 0 0',
          background: 'linear-gradient(180deg, #1e3020 0%, #161f16 100%)',
          borderTop: '1px solid rgba(255,255,255,0.09)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.5)',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          outline: 'none', transform: 'translateY(100%)',
        }}
      >
        {/* Drag handle — only this area is draggable */}
        <div
          ref={handleRef}
          style={{
            display: 'flex', justifyContent: 'center',
            padding: '12px 0 8px',
            cursor: 'grab', flexShrink: 0,
            touchAction: 'none',
          }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(138,158,138,0.35)' }} />
        </div>

        {title && (
          <div style={{ padding: '4px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <p style={{ fontFamily: "'Instrument Serif', serif", color: '#EDE9DF', fontSize: 20, margin: 0 }}>
              {title}
            </p>
          </div>
        )}

        {/* Scrollable body — completely independent of the drag handle */}
        <div
          style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1 }}
          className="scrollbar-hide"
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
