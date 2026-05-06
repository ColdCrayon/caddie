import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Group, GroupMember, GroupPost } from '../types'

export function useGroup(userId: string | undefined) {
  return useQuery({
    queryKey: ['group', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select('*, group:group_info(*)')
        .eq('user_id', userId!)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data as (GroupMember & { group: Group }) | null
    },
    enabled: !!userId,
  })
}

export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select('*, user:users(*)')
        .eq('group_id', groupId!)
      if (error) throw error
      return data as GroupMember[]
    },
    enabled: !!groupId,
  })
}

export function useGroupPosts(roundId: string | undefined) {
  return useQuery({
    queryKey: ['group-posts', roundId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_posts')
        .select('*, user:users(display_name)')
        .eq('round_id', roundId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as GroupPost[]
    },
    enabled: !!roundId,
  })
}

export function useGroupPostsRealtime(roundId: string | undefined) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!roundId) return
    const channel = supabase
      .channel(`posts:${roundId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_posts',
        filter: `round_id=eq.${roundId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['group-posts', roundId] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [roundId, qc])
}

export function usePostComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ roundId, userId, content }: { roundId: string; userId: string; content: string }) => {
      const { error } = await supabase
        .from('group_posts')
        .insert({ round_id: roundId, user_id: userId, content })
      if (error) throw error
    },
    onSuccess: (_, { roundId }) => qc.invalidateQueries({ queryKey: ['group-posts', roundId] }),
  })
}

export function useCreateGroup() {
  return useMutation({
    mutationFn: async ({ name, userId }: { name: string; userId: string }) => {
      const token = Math.random().toString(36).slice(2, 10)
      const { data: group, error: ge } = await supabase
        .from('group_info')
        .insert({ name, invite_token: token, created_by: userId })
        .select()
        .single()
      if (ge) throw ge
      const { error: me } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: userId })
      if (me) throw me
      return group as Group
    },
  })
}

export function useJoinGroup() {
  return useMutation({
    mutationFn: async ({ token, userId }: { token: string; userId: string }) => {
      const { data: group, error: ge } = await supabase
        .from('group_info')
        .select()
        .eq('invite_token', token)
        .single()
      if (ge) throw new Error('Invalid invite link')
      const { error: me } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: userId })
      if (me && me.code !== '23505') throw me
      return group as Group
    },
  })
}
