import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Round, HolePlayed } from '../types'

export function useRounds(userId: string | undefined) {
  return useQuery({
    queryKey: ['rounds', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rounds')
        .select('*, course:courses(name, location)')
        .eq('user_id', userId!)
        .order('date', { ascending: false })
      if (error) throw error
      return data as Round[]
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useRound(roundId: string | undefined) {
  return useQuery({
    queryKey: ['round', roundId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rounds')
        .select('*, course:courses(*), holes_played(*)')
        .eq('id', roundId!)
        .single()
      if (error) throw error
      return data as Round
    },
    enabled: !!roundId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useSaveRound() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (round: Omit<Round, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('rounds').insert(round).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rounds'] }),
  })
}

export function useSaveHolesPlayed() {
  return useMutation({
    mutationFn: async (holes: Omit<HolePlayed, 'id'>[]) => {
      const { error } = await supabase.from('holes_played').insert(holes)
      if (error) throw error
    },
  })
}
