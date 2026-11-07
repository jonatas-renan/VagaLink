import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Dashboard from './components/Dashboard'
import Login from './components/Login'

export default function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />
  }

  return <Dashboard user={user} onLogout={() => supabase.auth.signOut()} />
}