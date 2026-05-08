import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ActiveRoundState, ActiveHoleState, TeeColor } from '../types'

const DEFAULT_HOLE: Omit<ActiveHoleState, 'holeNumber' | 'par' | 'yardage'> = {
  strokes: 0,
  putts: 0,
  fairwayHit: false,
  gir: false,
  sandSave: false,
  pinLat: null,
  pinLng: null,
}

interface RoundStore {
  activeRound: ActiveRoundState | null
  isOffline: boolean
  startRound: (params: {
    roundId: string
    courseId: string
    courseName: string
    courseLat?: number | null
    courseLng?: number | null
    teeColor: TeeColor
    holes: { par: number; yardage: number }[]
  }) => void
  setCurrentHole: (index: number) => void
  updateHole: (index: number, updates: Partial<ActiveHoleState>) => void
  setOffline: (offline: boolean) => void
  clearRound: () => void
  getScoreToPar: () => number
  getCompletedHoles: () => number
}

export const useRoundStore = create<RoundStore>()(
  persist(
    (set, get) => ({
      activeRound: null,
      isOffline: false,

      startRound: ({ roundId, courseId, courseName, courseLat, courseLng, teeColor, holes }) => {
        const holeStates: ActiveHoleState[] = holes.map((h, i) => ({
          holeNumber: i + 1,
          par: h.par,
          yardage: h.yardage,
          ...DEFAULT_HOLE,
        }))
        set({
          activeRound: {
            roundId,
            courseId,
            courseName,
            courseLat: courseLat ?? null,
            courseLng: courseLng ?? null,
            teeColor,
            date: new Date().toISOString(),
            holes: holeStates,
            currentHoleIndex: 0,
            isOffline: false,
          },
        })
      },

      setCurrentHole: (index) =>
        set((s) => ({
          activeRound: s.activeRound ? { ...s.activeRound, currentHoleIndex: index } : null,
        })),

      updateHole: (index, updates) =>
        set((s) => {
          if (!s.activeRound) return s
          const holes = [...s.activeRound.holes]
          holes[index] = { ...holes[index], ...updates }
          // score_label is derived, computed in HoleCard via getScoreLabel
          return { activeRound: { ...s.activeRound, holes } }
        }),

      setOffline: (offline) =>
        set((s) => ({
          isOffline: offline,
          activeRound: s.activeRound ? { ...s.activeRound, isOffline: offline } : null,
        })),

      clearRound: () => set({ activeRound: null }),

      getScoreToPar: () => {
        const { activeRound } = get()
        if (!activeRound) return 0
        return activeRound.holes.reduce((total, hole) => {
          if (hole.strokes === 0) return total
          return total + (hole.strokes - hole.par)
        }, 0)
      },

      getCompletedHoles: () => {
        const { activeRound } = get()
        if (!activeRound) return 0
        return activeRound.holes.filter((h) => h.strokes > 0).length
      },
    }),
    { name: 'caddie-active-round' }
  )
)
