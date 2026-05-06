import { useState } from 'react'
import { motion } from 'framer-motion'
import { SafeArea } from '../components/layout/SafeArea'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useUserStore } from '../stores/userStore'
import { useGroup, useGroupMembers, useCreateGroup, useJoinGroup } from '../hooks/useLeague'
import { useRounds } from '../hooks/useRound'
import type { User } from '../types'

export default function League() {
  const user = useUserStore((s) => s.user)
  const { data: groupMembership, refetch: refetchGroup } = useGroup(user?.id)
  const group = groupMembership?.group
  const groupId = group?.id as string | undefined

  const { data: members } = useGroupMembers(groupId)
  const createGroup = useCreateGroup()
  const joinGroup = useJoinGroup()

  const [newGroupName, setNewGroupName] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [setup, setSetup] = useState<'idle' | 'create' | 'join'>('idle')
  const [copySuccess, setCopySuccess] = useState(false)

  const handleCreate = async () => {
    if (!user || !newGroupName.trim()) return
    await createGroup.mutateAsync({ name: newGroupName.trim(), userId: user.id })
    refetchGroup()
  }

  const handleJoin = async () => {
    if (!user || !inviteToken.trim()) return
    await joinGroup.mutateAsync({ token: inviteToken.trim(), userId: user.id })
    refetchGroup()
  }

  const inviteLink = group ? `${window.location.origin}/join/${group.invite_token}` : ''
  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    })
  }

  return (
    <SafeArea>
      <PageHeader title="League" subtitle={group?.name ?? 'Your group'} />
      <div className="px-4 py-4 space-y-4">
        {!group && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-5 space-y-4">
              <p className="font-display text-chalk text-lg font-semibold">Join the crew</p>
              <p className="font-ui text-chalk/50 text-sm">
                Create a group to compete with your friends, or enter an invite link to join theirs.
              </p>

              {setup === 'idle' && (
                <div className="flex gap-3">
                  <Button onClick={() => setSetup('create')} className="flex-1">Create Group</Button>
                  <Button variant="secondary" onClick={() => setSetup('join')} className="flex-1">Join Group</Button>
                </div>
              )}

              {setup === 'create' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Group name (e.g. 'The Sandbaggers')"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full bg-ink border border-white/10 rounded-xl px-4 py-3 font-ui text-chalk
                               placeholder:text-chalk/30 focus:outline-none focus:border-sand/50"
                  />
                  <Button
                    onClick={handleCreate}
                    disabled={createGroup.isPending || !newGroupName.trim()}
                    className="w-full"
                  >
                    {createGroup.isPending ? 'Creating…' : 'Create Group'}
                  </Button>
                  <Button variant="ghost" onClick={() => setSetup('idle')} className="w-full">Back</Button>
                </div>
              )}

              {setup === 'join' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Invite code (e.g. 'abc12345')"
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    className="w-full bg-ink border border-white/10 rounded-xl px-4 py-3 font-ui text-chalk
                               placeholder:text-chalk/30 focus:outline-none focus:border-sand/50"
                  />
                  <Button
                    onClick={handleJoin}
                    disabled={joinGroup.isPending || !inviteToken.trim()}
                    className="w-full"
                  >
                    {joinGroup.isPending ? 'Joining…' : 'Join Group'}
                  </Button>
                  {joinGroup.isError && (
                    <p className="font-ui text-bogey text-sm">{(joinGroup.error as Error).message}</p>
                  )}
                  <Button variant="ghost" onClick={() => setSetup('idle')} className="w-full">Back</Button>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {group && (
          <>
            {/* Invite link */}
            <Card className="p-4">
              <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest mb-2">Invite Friends</p>
              <p className="font-mono text-chalk/60 text-xs break-all">{inviteLink}</p>
              <Button variant="secondary" onClick={copyInviteLink} className="w-full mt-3" size="sm">
                {copySuccess ? '✓ Copied!' : 'Copy Invite Link'}
              </Button>
            </Card>

            {/* Leaderboard */}
            <LeaderboardSection groupId={groupId!} members={members?.map((m) => m.user).filter(Boolean) as User[]} />
          </>
        )}
      </div>
    </SafeArea>
  )
}

function LeaderboardSection({ members }: { groupId: string; members: User[] }) {
  const user = useUserStore((s) => s.user)
  const allRoundsQueries = members.map((m) => useRounds(m.id))

  return (
    <div className="space-y-4">
      <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest">Season Standings</p>
      <div className="space-y-2">
        {members.map((member, i) => {
          const rounds = allRoundsQueries[i]?.data?.filter((r) => r.completed) ?? []
          const avg = rounds.length
            ? (rounds.slice(0, 5).reduce((t, r) => t + (r.total_score ?? 0), 0) / Math.min(rounds.length, 5)).toFixed(1)
            : '—'
          const best = rounds.length ? Math.min(...rounds.map((r) => r.total_score ?? 999)) : null

          return (
            <Card key={member.id} className={`p-4 flex items-center gap-3 ${member.id === user?.id ? 'border border-sand/20' : ''}`}>
              <span className="font-mono text-chalk/40 text-sm w-5">{i + 1}</span>
              <div className="flex-1">
                <p className="font-ui text-chalk font-medium text-sm">
                  {member.display_name}
                  {member.id === user?.id && <span className="text-sand text-xs ml-1">(you)</span>}
                </p>
                <p className="font-ui text-chalk/40 text-xs">{rounds.length} rounds</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-chalk text-sm">{avg}</p>
                <p className="font-ui text-chalk/40 text-[10px]">avg</p>
              </div>
              {best && (
                <div className="text-right">
                  <p className="font-mono text-sand text-sm">{best}</p>
                  <p className="font-ui text-chalk/40 text-[10px]">best</p>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
