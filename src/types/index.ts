export interface User {
  id: string
  email: string
  display_name: string
  handicap_index: number | null
  home_course_id: string | null
  created_at: string
}

export interface HoleData {
  number: number
  par: number
  yardage: { black: number; blue: number; white: number; red: number }
  handicap?: number
  // GPS coordinates — populated when course data includes them
  green_center_lat?: number | null
  green_center_lng?: number | null
  green_front_lat?: number | null
  green_front_lng?: number | null
  green_back_lat?: number | null
  green_back_lng?: number | null
  tee_lat?: number | null
  tee_lng?: number | null
}

export interface PlaysLike {
  distance: number     // elevation-adjusted yardage
  rawDistance: number  // GPS distance to pin
  elevDiffFt: number   // positive = pin is uphill
  grade: number        // grade percentage
}

export interface Course {
  id: string
  name: string
  location: string
  google_place_id: string | null
  lat: number | null
  lng: number | null
  holes: HoleData[]
  tee_options: string[]
  slope_rating?: Record<string, number>
  course_rating?: Record<string, number>
  api_course_id?: number | null
  created_at: string
}

export type TeeColor = 'black' | 'blue' | 'white' | 'red'
export type ScoreLabel = 'Eagle' | 'Birdie' | 'Par' | 'Bogey' | 'Double' | 'Triple+'

export interface HolePlayed {
  id?: string
  round_id: string
  hole_number: number
  par: number
  yardage: number
  strokes: number
  putts: number
  fairway_hit: boolean
  gir: boolean
  sand_save: boolean
  score_label: ScoreLabel
}

export interface Round {
  id: string
  user_id: string
  course_id: string
  course?: Course
  date: string
  tee_color: TeeColor
  weather_conditions: WeatherConditions | null
  total_score: number
  score_differential: number | null
  notes: string
  completed: boolean
  holes_played?: HolePlayed[]
}

export interface WeatherConditions {
  temperature: number
  wind_speed: number
  wind_direction: number
  description: string
}

export type Lie = 'fairway' | 'rough' | 'sand' | 'trees' | 'fringe' | 'green'
export type Club =
  | 'driver' | '3w' | '5w' | '3h' | '4h' | '5h'
  | '3i' | '4i' | '5i' | '6i' | '7i' | '8i' | '9i'
  | 'pw' | 'gw' | 'sw' | 'lw' | 'putter'

export const CLUBS: Club[] = [
  'driver', '3w', '5w', '3h', '4h', '5h',
  '3i', '4i', '5i', '6i', '7i', '8i', '9i',
  'pw', 'gw', 'sw', 'lw', 'putter',
]

export const CLUB_LABELS: Record<Club, string> = {
  driver: 'Driver', '3w': '3 Wood', '5w': '5 Wood',
  '3h': '3 Hybrid', '4h': '4 Hybrid', '5h': '5 Hybrid',
  '3i': '3 Iron', '4i': '4 Iron', '5i': '5 Iron',
  '6i': '6 Iron', '7i': '7 Iron', '8i': '8 Iron', '9i': '9 Iron',
  'pw': 'PW', 'gw': 'GW', 'sw': 'SW', 'lw': 'LW', 'putter': 'Putter',
}

export interface Shot {
  id?: string
  round_id: string
  hole_played_id: string
  club: Club
  lie: Lie
  distance_to_pin: number
  wind_speed: number
  wind_direction: number
  elevation_change: number
  carry_distance: number | null
  result: string | null
  gps_lat: number | null
  gps_lng: number | null
  ai_advice: string | null
  created_at?: string
}

export interface Swing {
  id: string
  user_id: string
  video_url: string
  club: Club
  date: string
  ai_analysis: SwingAnalysis | null
  rating: number
  notes: string
  created_at: string
}

export interface SwingFrame {
  position: string
  correct: string
  improve: string
}

export interface SwingMetric {
  name: string
  value: string
  status: 'good' | 'watch' | 'fix'
  note: string
}

export interface SwingTip {
  priority: 1 | 2 | 3
  fault: string
  drill: string
}

export interface SwingBiometrics {
  shoulderRotation: number
  hipRotation: number
  xFactor: number
  leadArmAngle: number
  spineTilt: number
  headDrift: number
  kneeFlexChange: number
  lowConfidence: boolean
}

export interface SwingAnalysis {
  summary: string
  metrics: SwingMetric[]
  tips: SwingTip[]
  // Legacy fields from pre-MediaPipe analyses
  overall?: string
  frames?: SwingFrame[]
}

export interface Group {
  id: string
  name: string
  invite_token: string
  created_by: string
  created_at: string
}

export interface GroupMember {
  id: string
  user_id: string
  joined_at: string
  user?: User
}

export interface GroupPost {
  id: string
  round_id: string
  user_id: string
  content: string
  created_at: string
  user?: User
}

export interface CourseGamePlan {
  id: string
  course_id: string
  holes: { number: number; tip: string }[]
  generated_at: string
}

export interface Digest {
  id: string
  user_id: string
  content: string
  generated_at: string
}

export interface ActiveHoleState {
  holeNumber: number
  par: number
  yardage: number
  strokes: number
  putts: number
  fairwayHit: boolean
  gir: boolean
  sandSave: boolean
  pinLat: number | null
  pinLng: number | null
  pinIsCustom: boolean
  pinZone: 'front' | 'middle' | 'back' | null
  greenCenterLat: number | null
  greenCenterLng: number | null
  greenFrontLat: number | null
  greenFrontLng: number | null
  greenBackLat: number | null
  greenBackLng: number | null
}

export interface ActiveRoundState {
  roundId: string | null
  courseId: string | null
  courseName: string
  courseLat: number | null
  courseLng: number | null
  teeColor: TeeColor
  date: string
  holes: ActiveHoleState[]
  currentHoleIndex: number
  isOffline: boolean
}
