import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login({ onLoginSuccess }) {
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
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        alert('Cadastro realizado! Verifique seu e-mail ou faça login.')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (onLoginSuccess) onLoginSuccess(data.user)
      }
    } catch (err) {
      if (err.message.includes('Invalid login credentials')) {
        setErro('E-mail ou senha incorretos.')
      } else {
        setErro(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-vaga-dark flex items-center justify-center p-4 font-sans">
      
      {/* Card do formulário */}
      <div className="bg-vaga-card border border-zinc-800 w-full max-w-sm rounded-2xl p-8 shadow-2xl text-center">
        
        {/* === LOGO EM VETOR (SVG) E NOME DO APP === */}
        <div className="flex flex-col items-center justify-center mb-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-16 h-16 text-vaga-green mb-2"
          >
            {/* Desenho do Carro */}
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 12 10s-6.7.6-8.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <path d="M9 17h6"/>
            <circle cx="17" cy="17" r="2"/>
            <path d="M14 10V8c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2"/>
            <path d="M8 2c2.4-1.2 5.6-1.2 8 0" />
            <path d="M10 5c1.2-.6 2.8-.6 4 0" />
          </svg>

          {/* Tipografia Moderna */}
          <h2 className="text-4xl font-extrabold tracking-tight">
            <span className="text-vaga-green">Vaga</span>
            <span className="text-white">Link</span>
          </h2>
        </div>
        {/* ======================================== */}

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
            className="w-full bg-vaga-green hover:bg-vaga-green-hover disabled:bg-zinc-800 disabled:text-zinc-500 text-vaga-dark font-bold py-3 rounded-lg mt-2 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? 'Carregando...' : isRegistering ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => onLoginSuccess({ email: 'aluno@teste.com' })}
          className="mt-4 w-full bg-transparent border border-dashed border-vaga-green text-vaga-green font-bold py-2 rounded-lg hover:bg-vaga-green/10 transition-colors cursor-pointer"
        >
          Entrar sem Login (Modo Teste)
        </button>

        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="mt-6 text-sm text-zinc-400 hover:text-vaga-green transition-colors cursor-pointer"
        >
          {isRegistering
            ? 'Já tem uma conta? Faça login'
            : 'Não tem conta? Cadastre-se'}
        </button>
      </div>
    </div>
  )
}