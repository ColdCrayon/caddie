import { type ReactNode } from 'react'
import { Drawer } from 'vaul'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => { if (!o) onClose() }}
      // Vaul's native scroll-aware dismiss: only fires when content is at top
      dismissible
    >
      <Drawer.Portal>
        {/* Backdrop */}
        <Drawer.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            background: 'rgba(14,22,14,0.72)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        />

        {/* Sheet */}
        <Drawer.Content
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            maxWidth: 430,
            margin: '0 auto',
            borderRadius: '20px 20px 0 0',
            background: 'linear-gradient(180deg, #1e3020 0%, #161f16 100%)',
            borderTop: '1px solid rgba(255,255,255,0.09)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            overflowX: 'hidden',
            boxShadow: '0 -4px 40px rgba(0,0,0,0.5)',
            outline: 'none',
            // vaul handles all transform/animation internally
          }}
        >
          {/* Drag handle — vaul makes the whole sheet draggable */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '12px 0 8px',
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: 'rgba(138,158,138,0.35)',
              }}
            />
          </div>

          {title && (
            <div
              style={{
                padding: '4px 20px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <p
                style={{
                  fontFamily: "'Instrument Serif', serif",
                  color: '#EDE9DF',
                  fontSize: 20,
                  margin: 0,
                }}
              >
                {title}
              </p>
            </div>
          )}

          {/* Scrollable content — vaul natively handles scroll vs drag disambiguation */}
          <div
            style={{
              overflowY: 'auto',
              overflowX: 'hidden',
              maxHeight: '82vh',
              width: '100%',
            }}
            className="scrollbar-hide"
          >
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
