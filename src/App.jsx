import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Dashboard from './components/Dashboard'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Busca a sessão atual quando o app abre (ignora erros de rede se o Supabase não estiver configurado)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!error) {
        setUser(session?.user ?? null)
      }
      setLoading(false)
    }).catch(() => {
      // Se der erro de conexão com o Supabase, tira o loading para não travar
      setLoading(false)
    })

    // Fica escutando para ver se o usuário logou ou deslogou
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    // Se o usuário clicou no botão "Teste", a gente apenas limpa o estado
    if (user?.email === 'aluno@teste.com') {
      setUser(null)
      return
    }
    // Caso contrário, desloga do Supabase de verdade
    await supabase.auth.signOut()
  }

  // Tela de carregamento
  if (loading) {
    return (
      <div className="min-h-screen bg-vaga-dark flex items-center justify-center text-vaga-green font-bold">
        Carregando...
      </div>
    )
  }

  // Se não tem usuário logado, exibe a tela de Login
  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />
  }

  // Se tem usuário (oficial ou de teste), CHAMA O COMPONENTE DASHBOARD COM O MAPA
  return <Dashboard user={user} onLogout={handleLogout} />
}