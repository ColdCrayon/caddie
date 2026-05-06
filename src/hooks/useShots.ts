import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Shot } from '../types'

export function useShots(roundId: string | undefined) {
  return useQuery({
    queryKey: ['shots', roundId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shots')
        .select('*')
        .eq('round_id', roundId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Shot[]
    },
    enabled: !!roundId,
  })
}

export function useClubDistanceAverages(userId: string | undefined) {
  return useQuery({
    queryKey: ['club-averages', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shots')
        .select('club, carry_distance')
        .not('carry_distance', 'is', null)
      if (error) throw error

      const byClub: Record<string, number[]> = {}
      for (const shot of data) {
        if (!byClub[shot.club]) byClub[shot.club] = []
        byClub[shot.club].push(shot.carry_distance)
      }

      const averages: Record<string, number> = {}
      for (const [club, distances] of Object.entries(byClub)) {
        averages[club] = Math.round(
          distances.reduce((a, b) => a + b, 0) / distances.length
        )
      }
      return averages
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  })
}

export function useSaveShot() {
  return useMutation({
    mutationFn: async (shot: Omit<Shot, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('shots').insert(shot).select().single()
      if (error) throw error
      return data
    },
  })
}
