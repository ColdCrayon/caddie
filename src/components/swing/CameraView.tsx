import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '../ui/Button'

type Mode = 'face-on' | 'down-the-line'

interface CameraViewProps {
  onRecorded: (blob: Blob, view: Mode) => void
}

export function CameraView({ onRecorded }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [mode, setMode] = useState<Mode>('face-on')
  const [recording, setRecording] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [streamActive, setStreamActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setStreamActive(true)
      }
    } catch {
      setError('Camera access denied. Enable camera permissions in Safari settings.')
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [startCamera])

  const beginRecording = () => {
    const stream = videoRef.current?.srcObject as MediaStream
    if (!stream) return

    setCountdown(3)
    let count = 3
    const interval = setInterval(() => {
      count--
      setCountdown(count > 0 ? count : null)
      if (count <= 0) {
        clearInterval(interval)
        const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm'
        const recorder = new MediaRecorder(stream, { mimeType })
        mediaRecorderRef.current = recorder
        chunksRef.current = []

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data)
        }

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mimeType })
          const url = URL.createObjectURL(blob)
          setPreview(url)
          setPreviewBlob(blob)
          setRecording(false)
        }

        recorder.start()
        setRecording(true)

        setTimeout(() => recorder.state === 'recording' && recorder.stop(), 8000)
      }
    }, 1000)
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
  }

  const acceptRecording = () => {
    if (previewBlob) {
      onRecorded(previewBlob, mode)
      setPreview(null)
      setPreviewBlob(null)
    }
  }

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setPreviewBlob(null)
  }

  if (preview) {
    return (
      <div className="space-y-4">
        <video
          src={preview}
          controls
          playsInline
          className="w-full rounded-2xl aspect-video bg-ink"
        />
        <div className="flex gap-3">
          <Button variant="secondary" onClick={retake} className="flex-1">
            Retake
          </Button>
          <Button onClick={acceptRecording} className="flex-1">
            Analyze Swing
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex rounded-xl overflow-hidden border border-white/10">
        {(['face-on', 'down-the-line'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2.5 font-ui text-sm transition-colors
              ${mode === m ? 'bg-sand/20 text-sand' : 'text-chalk/40'}`}
          >
            {m === 'face-on' ? 'Face-On' : 'Down the Line'}
          </button>
        ))}
      </div>

      {/* Camera */}
      <div className="relative aspect-video bg-ink rounded-2xl overflow-hidden">
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
            <p className="font-ui text-bogey text-sm">{error}</p>
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {/* Silhouette overlay */}
        <svg
          className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
          viewBox="0 0 320 180"
          preserveAspectRatio="xMidYMid meet"
        >
          <ellipse cx="160" cy="30" rx="12" ry="14" fill="#c8a96e" />
          <rect x="150" y="44" width="20" height="48" rx="4" fill="#c8a96e" />
          <rect x="120" y="48" width="30" height="6" rx="3" fill="#c8a96e" />
          <rect x="170" y="48" width="30" height="6" rx="3" fill="#c8a96e" />
          <rect x="148" y="92" width="10" height="40" rx="3" fill="#c8a96e" />
          <rect x="162" y="92" width="10" height="40" rx="3" fill="#c8a96e" />
        </svg>
        {/* Countdown */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-sand text-8xl font-bold opacity-80">{countdown}</span>
          </div>
        )}
        {/* Recording indicator */}
        {recording && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-bogey animate-pulse" />
            <span className="font-ui text-xs text-bogey">REC</span>
          </div>
        )}
        <p className="absolute bottom-2 left-0 right-0 text-center font-ui text-[10px] text-chalk/40">
          {mode === 'face-on' ? 'Face-On' : 'Down the Line'} • Align body with silhouette
        </p>
      </div>

      {!streamActive && !error && (
        <p className="text-center font-ui text-chalk/40 text-sm">Starting camera…</p>
      )}

      {streamActive && !recording && !countdown && (
        <Button onClick={beginRecording} className="w-full" size="lg">
          Record Swing (8s max)
        </Button>
      )}
      {recording && (
        <Button onClick={stopRecording} variant="danger" className="w-full" size="lg">
          Stop Recording
        </Button>
      )}
    </div>
  )
}
