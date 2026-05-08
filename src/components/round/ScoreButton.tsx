interface ScoreButtonProps {
  label: string
  value: number
  onDecrement: () => void
  onIncrement: () => void
  min?: number
}

export function ScoreButton({ label, value, onDecrement, onIncrement, min = 0 }: ScoreButtonProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="font-ui text-fog text-xs uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-4">
        <button
          onClick={onDecrement}
          disabled={value <= min}
          className="flex items-center justify-center transition-all duration-150 select-none
                     active:scale-[0.92] disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            border: '1.5px solid rgba(201,169,110,0.3)',
            background: 'rgba(36,56,36,0.6)',
            color: '#C9A96E',
            fontSize: 32,
            fontWeight: 300,
          }}
        >
          −
        </button>

        <span
          className="font-display text-chalk tabular-nums text-center"
          style={{ fontSize: 52, lineHeight: 1, minWidth: 48 }}
        >
          {value}
        </span>

        <button
          onClick={onIncrement}
          className="flex items-center justify-center transition-all duration-150 select-none
                     active:scale-[0.92] cursor-pointer"
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            border: '1.5px solid rgba(201,169,110,0.3)',
            background: 'rgba(36,56,36,0.6)',
            color: '#C9A96E',
            fontSize: 32,
            fontWeight: 300,
          }}
        >
          +
        </button>
      </div>
    </div>
  )
}
