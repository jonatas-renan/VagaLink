import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

// Componentes
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import Beneficios from './components/Beneficios'
import Termos from './components/Termos'

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
        
      if (perfil) setRole(perfil.role)
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => fetchUserAndRole(session?.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => fetchUserAndRole(session?.user))

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="min-h-screen bg-vaga-dark flex items-center justify-center text-vaga-green font-bold">Carregando...</div>
  }

  return (
    <Router>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/beneficios" element={<Beneficios />} />
        <Route path="/termos" element={<Termos />} />
        
        {/* Rota de Login */}
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to="/" />} 
        />

        {/* Rota Principal */}
        <Route 
          path="/" 
          element={user ? <Dashboard user={user} role={role} onLogout={() => supabase.auth.signOut()} /> : <Navigate to="/login" />} 
        />

        {/* Rota Admin */}
        <Route 
          path="/admin" 
          element={user && role === 'admin' ? <div>Tela Admin (Em breve)</div> : <Navigate to="/" />} 
        />
      </Routes>
    </Router>
  )
}