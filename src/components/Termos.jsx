import { Link } from 'react-router-dom'

export default function Termos() {
  return (
    <div className="min-h-screen bg-vaga-dark flex items-center justify-center p-4 font-sans text-white">
      <div className="bg-vaga-card border border-zinc-800 w-full max-w-lg rounded-2xl p-8 shadow-2xl">
        
        <h2 className="text-3xl font-extrabold tracking-tight text-center mb-6">
          <span className="text-vaga-green">Termos </span>
          <span className="text-white">de Uso</span>
        </h2>
        
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 text-sm text-zinc-400 h-64 overflow-y-auto mb-8 space-y-4 custom-scrollbar">
          <p>
            <strong>1. Aceitação dos Termos:</strong> Ao criar uma conta no VagaLink, você concorda com a coleta e uso de dados relacionados ao estacionamento no campus.
          </p>
          <p>
            <strong>2. Uso do Sistema:</strong> O sistema visa facilitar a busca por vagas, porém não garante a reserva ou a disponibilidade exata no momento da chegada física, devido ao fluxo contínuo.
          </p>
          <p>
            <strong>3. Privacidade:</strong> Seu e-mail institucional será utilizado apenas para fins de autenticação e comunicação sobre o sistema, não sendo compartilhado com terceiros.
          </p>
          <p>
            <strong>4. Limitação de Responsabilidade:</strong> O VagaLink não se responsabiliza por furtos, danos a veículos ou incidentes ocorridos no estacionamento da instituição.
          </p>
        </div>

        <Link 
          to="/login"
          className="block text-center w-full bg-vaga-green text-vaga-dark font-bold py-3 rounded-lg hover:brightness-110 transition-all"
        >
          Concordar e Voltar
        </Link>
      </div>
    </div>
  )
}