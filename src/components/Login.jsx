import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErro('')

    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        alert('Cadastro realizado! Se a confirmação de e-mail estiver desativada, você já está logado.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      if (err.message.includes('Invalid login credentials')) {
        setErro('E-mail ou senha incorretos.')
      } else if (err.message.includes('User already registered')) {
         setErro('Este e-mail já está cadastrado.')
      } else {
        setErro(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-vaga-dark flex items-center justify-center p-4 font-sans">
      <div className="bg-vaga-card border border-zinc-800 w-full max-w-sm rounded-2xl p-8 shadow-2xl text-center">
        
        <div className="flex flex-col items-center justify-center mb-6 mt-2">
          <h2 className="text-5xl font-extrabold tracking-tight">
            <span className="text-vaga-green">Vaga</span>
            <span className="text-white">Link</span>
          </h2>
        </div>

        <p className="text-zinc-400 text-sm mb-6">
          {isRegistering ? 'Crie sua conta na plataforma' : 'Acesse o sistema de vagas'}
        </p>

        {erro && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg mb-6">
            {erro}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Seu e-mail da faculdade"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg p-3 outline-none focus:border-vaga-green focus:ring-2 focus:ring-vaga-green/20 transition-all placeholder:text-zinc-500"
          />
          
          <input
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg p-3 outline-none focus:border-vaga-green focus:ring-2 focus:ring-vaga-green/20 transition-all placeholder:text-zinc-500"
          />

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-vaga-green hover:bg-vaga-green-hover disabled:bg-zinc-800 disabled:text-zinc-500 text-vaga-dark font-bold py-3 rounded-lg mt-2 transition-all cursor-pointer"
          >
            {loading ? 'Carregando...' : isRegistering ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>

        <div className="flex flex-col gap-3 mt-6">
          <Link to="/beneficios" className="text-sm font-bold text-vaga-green hover:brightness-110 transition-colors">
            🌟 Conheça nossos benefícios
          </Link>
          
          {isRegistering && (
             <Link to="/termos" className="text-xs text-zinc-500 hover:text-white transition-colors underline">
               Ler Termos de Uso
             </Link>
          )}

          <button
            onClick={() => { setIsRegistering(!isRegistering); setErro('') }}
            className="text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer mt-2"
          >
            {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  )
}