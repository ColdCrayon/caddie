import { SafeArea } from '../components/layout/SafeArea'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useUserStore } from '../stores/userStore'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const user = useUserStore((s) => s.user)
  const setUser = useUserStore((s) => s.setUser)
  const navigate = useNavigate()

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    navigate('/auth')
  }

  return (
    <SafeArea>
      <PageHeader title="Settings" />
      <div className="px-4 py-4 space-y-4">
        <Card className="p-4 space-y-3">
          <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest">Account</p>
          <p className="font-ui text-chalk">{user?.display_name}</p>
          <p className="font-ui text-chalk/50 text-sm">{user?.email}</p>
          {user?.handicap_index !== null && (
            <p className="font-mono text-sand text-sm">Handicap: {user?.handicap_index}</p>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <p className="font-ui text-chalk/40 text-xs uppercase tracking-widest">PWA Install</p>
          <p className="font-ui text-chalk/60 text-sm">
            In Safari, tap the Share button (□↑) then "Add to Home Screen" to install Caddie as an app.
          </p>
        </Card>

        <Button variant="danger" onClick={signOut} className="w-full">
          Sign Out
        </Button>
      </div>
    </SafeArea>
  )
}
