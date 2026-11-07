import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  
  const [mostrarBeneficios, setMostrarBeneficios] = useState(false)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErro('')

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        alert('Cadastro realizado! Se o email confirmation estiver desativado no Supabase, você já pode fazer login.')
        setIsRegistering(false)
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (onLoginSuccess) onLoginSuccess(data.user)
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

  if (mostrarBeneficios) {
    return (
      <div className="min-h-screen bg-vaga-dark flex items-center justify-center p-4 font-sans text-white">
        <div className="bg-vaga-card border border-zinc-800 w-full max-w-lg rounded-2xl p-8 shadow-2xl">
          
          <div className="flex flex-col items-center mb-6">
            <h2 className="text-3xl font-extrabold tracking-tight text-center">
              O Impacto do <span className="text-vaga-green">VagaLink</span>
            </h2>
            <p className="text-zinc-400 text-sm mt-2 text-center">
              Veja como nossa tecnologia está transformando o campus.
            </p>
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 hover:border-vaga-green transition-colors">
              <h3 className="font-bold text-lg text-white mb-1">🌱 Redução de Emissão de CO²</h3>
              <p className="text-sm text-zinc-400">
                Ao guiar os motoristas direto para as vagas livres, reduzimos drasticamente o tempo de veículos circulando à toa, diminuindo a poluição no campus.
              </p>
            </div>
            
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 hover:border-vaga-green transition-colors">
              <h3 className="font-bold text-lg text-white mb-1">⏱️ Otimização de Tempo</h3>
              <p className="text-sm text-zinc-400">
                Chega de atrasos nas aulas! Estudantes e professores economizam preciosos minutos sabendo exatamente onde estacionar.
              </p>
            </div>

            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 hover:border-vaga-green transition-colors">
              <h3 className="font-bold text-lg text-white mb-1">🧘 Menos Estresse e Filas</h3>
              <p className="text-sm text-zinc-400">
                Melhora na fluidez do trânsito interno, evitando congestionamentos na entrada e proporcionando uma experiência muito mais tranquila.
              </p>
            </div>
          </div>

          <button 
            onClick={() => setMostrarBeneficios(false)}
            className="w-full bg-transparent border border-vaga-green text-vaga-green font-bold py-3 rounded-lg hover:bg-vaga-green hover:text-vaga-dark transition-all cursor-pointer"
          >
            Voltar para o Login
          </button>
        </div>
      </div>
    )
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
            className="w-full bg-vaga-green hover:bg-vaga-green-hover disabled:bg-zinc-800 disabled:text-zinc-500 text-vaga-dark font-bold py-3 rounded-lg mt-2 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? 'Carregando...' : isRegistering ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMostrarBeneficios(true)}
          className="mt-4 w-full bg-transparent border border-dashed border-vaga-green text-vaga-green font-bold py-2 rounded-lg hover:bg-vaga-green/10 transition-colors cursor-pointer"
        >
          🌟 Conheça nossos benefícios
        </button>

        <button
          onClick={() => {
            setIsRegistering(!isRegistering)
            setErro('') 
          }}
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