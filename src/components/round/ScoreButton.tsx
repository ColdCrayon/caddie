interface ScoreButtonProps {
  label: string
  value: number
  onDecrement: () => void
  onIncrement: () => void
  min?: number
}

export function ScoreButton({ label, value, onDecrement, onIncrement, min = 0 }: ScoreButtonProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-ui text-chalk/50 text-xs uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={onDecrement}
          disabled={value <= min}
          className="w-12 h-12 rounded-xl bg-rough border border-white/10 text-chalk text-2xl font-bold
                     flex items-center justify-center active:scale-90 transition-transform
                     disabled:opacity-30 disabled:active:scale-100"
        >
          −
        </button>
        <span className="font-mono text-chalk text-4xl font-bold w-10 text-center tabular-nums">
          {value}
        </span>
        <button
          onClick={onIncrement}
          className="w-12 h-12 rounded-xl bg-rough border border-white/10 text-chalk text-2xl font-bold
                     flex items-center justify-center active:scale-90 transition-transform"
        >
          +
        </button>
      </div>
    </div>
  )
}
