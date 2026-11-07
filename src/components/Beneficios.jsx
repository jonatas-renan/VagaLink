import { Link } from 'react-router-dom'

export default function Beneficios() {
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
              Ao guiar os motoristas direto para as vagas, reduzimos o tempo de veículos circulando, diminuindo a poluição no campus.
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
              Melhora na fluidez do trânsito interno, evitando congestionamentos na entrada e proporcionando uma experiência tranquila.
            </p>
          </div>
        </div>

        <Link 
          to="/login"
          className="block text-center w-full bg-transparent border border-vaga-green text-vaga-green font-bold py-3 rounded-lg hover:bg-vaga-green hover:text-vaga-dark transition-all"
        >
          Voltar para o Login
        </Link>
      </div>
    </div>
  )
}