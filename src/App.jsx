import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Dashboard from './components/Dashboard'
import Login from './components/Login'

export default function App() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null) 
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserAndRole = async (sessionUser) => {
      if (!sessionUser) {
        setUser(null)
        setRole(null)
        setLoading(false)
        return
      }

      setUser(sessionUser)
      
      const { data: perfil } = await supabase
        .from('perfis')
        .select('role')
        .eq('id', sessionUser.id)
        .single()
        
      if (perfil) {
        setRole(perfil.role)
      }
      
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchUserAndRole(session?.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchUserAndRole(session?.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-vaga-dark flex items-center justify-center text-vaga-green font-bold">
        Carregando...
      </div>
    )
  }

  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />
  }

  return <Dashboard user={user} role={role} onLogout={() => supabase.auth.signOut()} />
}