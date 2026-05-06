import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Swing } from '../types'

export function useSwings(userId: string | undefined) {
  return useQuery({
    queryKey: ['swings', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('swings')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Swing[]
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSaveSwing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (swing: Omit<Swing, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('swings').insert(swing).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['swings'] }),
  })
}

export function useUploadSwingVideo() {
  return useMutation({
    mutationFn: async ({ blob, userId }: { blob: Blob; userId: string }) => {
      const filename = `${userId}/${Date.now()}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`
      const { data, error } = await supabase.storage
        .from('swing-videos')
        .upload(filename, blob, { contentType: blob.type })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('swing-videos').getPublicUrl(data.path)
      return urlData.publicUrl
    },
  })
}
