import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import type { SwingBiometrics } from '../types'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'

// MediaPipe 33-landmark indices
const LM = {
  NOSE: 0,
  L_SHOULDER: 11, R_SHOULDER: 12,
  L_ELBOW: 13,
  L_WRIST: 15,
  L_HIP: 23, R_HIP: 24,
  L_KNEE: 25,
  L_ANKLE: 27,
}

export interface PoseLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export interface PosePhaseFrame {
  image: string // base64 JPEG (no data-URL prefix)
  landmarks: PoseLandmark[] // normalized 2D (0-1)
}

export type PhaseName =
  | 'address'
  | 'takeaway'
  | 'halfBackswing'
  | 'top'
  | 'downswing'
  | 'impact'
  | 'followThrough'

export type PhaseData = Record<PhaseName, PosePhaseFrame>

interface RawFrame {
  timestamp: number
  landmarks: PoseLandmark[]
  worldLandmarks: PoseLandmark[]
}

let landmarker: PoseLandmarker | null = null

export async function initPoseLandmarker(): Promise<void> {
  if (landmarker) return
  const vision = await FilesetResolver.forVisionTasks(WASM_URL)
  try {
    landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'IMAGE',
      numPoses: 1,
    })
  } catch {
    landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
      runningMode: 'IMAGE',
      numPoses: 1,
    })
  }
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const handler = () => {
      video.removeEventListener('seeked', handler)
      resolve()
    }
    video.addEventListener('seeked', handler)
    video.currentTime = time
  })
}

function calculateAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z }
  const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2 + ba.z ** 2)
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2 + bc.z ** 2)
  if (magBA === 0 || magBC === 0) return 0
  return Math.acos(Math.max(-1, Math.min(1, dot / (magBA * magBC)))) * (180 / Math.PI)
}

function horizontalAngle(p1: PoseLandmark, p2: PoseLandmark): number {
  return Math.atan2(p2.x - p1.x, p2.z - p1.z) * (180 / Math.PI)
}

function minKeyVisibility(lms: PoseLandmark[]): number {
  const keys = [LM.NOSE, LM.L_SHOULDER, LM.R_SHOULDER, LM.L_ELBOW, LM.L_WRIST, LM.L_HIP, LM.R_HIP, LM.L_KNEE]
  return Math.min(...keys.map((k) => lms[k]?.visibility ?? 0))
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function detectPhaseIndices(frames: RawFrame[]): Record<PhaseName, number> {
  const n = frames.length
  // World landmark Y = up; lead wrist (left wrist for right-hander) rises during backswing
  const wristYs = frames.map((f) => f.worldLandmarks[LM.L_WRIST]?.y ?? 0)

  const addressIdx = clamp(2, 0, n - 1)
  const topIdx = clamp(wristYs.indexOf(Math.max(...wristYs)), addressIdx + 1, n - 2)

  const postTopYs = wristYs.slice(topIdx)
  const impactRelIdx = postTopYs.indexOf(Math.min(...postTopYs))
  const impactIdx = clamp(topIdx + Math.max(1, impactRelIdx), topIdx + 1, n - 1)

  const t2a = topIdx - addressIdx
  const i2t = impactIdx - topIdx

  return {
    address: addressIdx,
    takeaway: clamp(Math.round(addressIdx + t2a * 0.25), 0, n - 1),
    halfBackswing: clamp(Math.round(addressIdx + t2a * 0.55), 0, n - 1),
    top: topIdx,
    downswing: clamp(Math.round(topIdx + i2t * 0.25), 0, n - 1),
    impact: impactIdx,
    followThrough: clamp(Math.round(impactIdx + (n - impactIdx) * 0.5), 0, n - 1),
  }
}

function calculateBiometrics(
  frames: RawFrame[],
  phaseIndices: Record<PhaseName, number>
): { biometrics: Omit<SwingBiometrics, 'lowConfidence'>; minConf: number } {
  const address = frames[phaseIndices.address]
  const top = frames[phaseIndices.top]
  const impact = frames[phaseIndices.impact]

  const aWL = address.worldLandmarks
  const tWL = top.worldLandmarks
  const iWL = impact.worldLandmarks

  // Shoulder rotation: angle change of shoulder line in horizontal (XZ) plane
  const aShoulderAngle = horizontalAngle(aWL[LM.R_SHOULDER], aWL[LM.L_SHOULDER])
  const tShoulderAngle = horizontalAngle(tWL[LM.R_SHOULDER], tWL[LM.L_SHOULDER])
  const shoulderRotation = Math.abs(tShoulderAngle - aShoulderAngle)

  // Hip rotation: same for hips
  const aHipAngle = horizontalAngle(aWL[LM.R_HIP], aWL[LM.L_HIP])
  const tHipAngle = horizontalAngle(tWL[LM.R_HIP], tWL[LM.L_HIP])
  const hipRotation = Math.abs(tHipAngle - aHipAngle)

  const xFactor = Math.max(0, shoulderRotation - hipRotation)

  // Lead arm angle at top (angle at left elbow)
  const leadArmAngle = calculateAngle(tWL[LM.L_SHOULDER], tWL[LM.L_ELBOW], tWL[LM.L_WRIST])

  // Spine tilt at address (angle of spine from vertical)
  const pelvisMid = {
    x: (aWL[LM.L_HIP].x + aWL[LM.R_HIP].x) / 2,
    y: (aWL[LM.L_HIP].y + aWL[LM.R_HIP].y) / 2,
    z: (aWL[LM.L_HIP].z + aWL[LM.R_HIP].z) / 2,
  }
  const shoulderMid = {
    x: (aWL[LM.L_SHOULDER].x + aWL[LM.R_SHOULDER].x) / 2,
    y: (aWL[LM.L_SHOULDER].y + aWL[LM.R_SHOULDER].y) / 2,
    z: (aWL[LM.L_SHOULDER].z + aWL[LM.R_SHOULDER].z) / 2,
  }
  const spineVec = {
    x: shoulderMid.x - pelvisMid.x,
    y: shoulderMid.y - pelvisMid.y,
    z: shoulderMid.z - pelvisMid.z,
  }
  const spineMag = Math.sqrt(spineVec.x ** 2 + spineVec.y ** 2 + spineVec.z ** 2)
  const spineTilt = spineMag > 0
    ? Math.acos(Math.max(-1, Math.min(1, spineVec.y / spineMag))) * (180 / Math.PI)
    : 0

  // Head drift: lateral displacement of nose in normalized image coords (address → impact)
  const headDrift =
    Math.abs((impact.landmarks[LM.NOSE]?.x ?? 0) - (address.landmarks[LM.NOSE]?.x ?? 0)) * 100

  // Lead knee flex change: address → impact (positive = more extension at impact)
  const kneeAtAddress = calculateAngle(aWL[LM.L_HIP], aWL[LM.L_KNEE], aWL[LM.L_ANKLE])
  const kneeAtImpact = calculateAngle(iWL[LM.L_HIP], iWL[LM.L_KNEE], iWL[LM.L_ANKLE])
  const kneeFlexChange = kneeAtAddress - kneeAtImpact

  const minConf = Math.min(
    minKeyVisibility(address.landmarks),
    minKeyVisibility(top.landmarks),
    minKeyVisibility(impact.landmarks)
  )

  return {
    biometrics: {
      shoulderRotation: Math.round(shoulderRotation),
      hipRotation: Math.round(hipRotation),
      xFactor: Math.round(xFactor),
      leadArmAngle: Math.round(leadArmAngle),
      spineTilt: Math.round(spineTilt),
      headDrift: Math.round(headDrift * 10) / 10,
      kneeFlexChange: Math.round(kneeFlexChange),
    },
    minConf,
  }
}

export async function analyzePoseFromVideo(
  blob: Blob
): Promise<{ biometrics: SwingBiometrics; phases: PhaseData }> {
  await initPoseLandmarker()
  const lm = landmarker!

  const url = URL.createObjectURL(blob)
  const video = document.createElement('video')
  video.src = url
  video.muted = true
  video.preload = 'auto'

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error('Video load failed'))
    video.load()
  })

  const duration = video.duration
  const W = Math.min(video.videoWidth || 640, 640)
  const H = Math.round((W * (video.videoHeight || 360)) / (video.videoWidth || 640))

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Sample one frame every ~0.13s (≈ every 4 frames at 30fps)
  const STEP = 0.13
  const timestamps: number[] = []
  for (let t = 0.1; t < duration; t += STEP) {
    timestamps.push(parseFloat(t.toFixed(3)))
  }

  // Extract pose landmarks for all sampled frames
  const rawFrames: RawFrame[] = []
  for (const t of timestamps) {
    await seekTo(video, t)
    ctx.drawImage(video, 0, 0, W, H)
    const result = lm.detect(canvas)
    if (result.landmarks.length > 0) {
      rawFrames.push({
        timestamp: t,
        landmarks: result.landmarks[0] as PoseLandmark[],
        worldLandmarks: result.worldLandmarks[0] as PoseLandmark[],
      })
    }
  }

  if (rawFrames.length < 7) {
    URL.revokeObjectURL(url)
    throw new Error('Pose detection failed — try better lighting with your full body in frame')
  }

  const phaseIndices = detectPhaseIndices(rawFrames)
  const { biometrics, minConf } = calculateBiometrics(rawFrames, phaseIndices)

  // Capture a JPEG image for each phase frame
  const phaseKeys: PhaseName[] = [
    'address', 'takeaway', 'halfBackswing', 'top', 'downswing', 'impact', 'followThrough',
  ]
  const phases = {} as PhaseData
  for (const key of phaseKeys) {
    const frame = rawFrames[phaseIndices[key]]
    await seekTo(video, frame.timestamp)
    ctx.drawImage(video, 0, 0, W, H)
    phases[key] = {
      image: canvas.toDataURL('image/jpeg', 0.7).split(',')[1],
      landmarks: frame.landmarks,
    }
  }

  URL.revokeObjectURL(url)

  return {
    biometrics: { ...biometrics, lowConfidence: minConf < 0.6 },
    phases,
  }
}
