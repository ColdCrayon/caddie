import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore'
import { useJoinGroup } from '../hooks/useLeague'

export default function Join() {
  const { token } = useParams<{ token: string }>()
  const user = useUserStore((s) => s.user)
  const navigate = useNavigate()
  const joinGroup = useJoinGroup()

  useEffect(() => {
    if (!token) return
    if (!user) {
      sessionStorage.setItem('pending-invite', token)
      navigate('/auth')
      return
    }
    joinGroup.mutate({ token, userId: user.id }, {
      onSuccess: () => navigate('/league'),
      onError: () => navigate('/league'),
    })
  }, [token, user])

  return (
    <div className="min-h-screen bg-fairway flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-sand border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-ui text-chalk/50 text-sm">Joining group…</p>
      </div>
    </div>
  )
}
