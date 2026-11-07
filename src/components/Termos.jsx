import { Link } from 'react-router-dom'

export default function Termos() {
  return (
    <div className="min-h-[100dvh] bg-vaga-dark flex flex-col items-center p-6 md:p-8 font-sans text-white">
      
      <div className="w-full max-w-4xl flex flex-col h-full flex-1">
        
        <div className="flex-none mb-6">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="text-vaga-green">Termos </span>
            <span className="text-white">de Uso</span>
          </h2>
          <p className="text-zinc-400 mt-2 text-base">
            Leia atentamente as condições de uso do VagaLink.
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-5 text-base text-zinc-300 leading-relaxed custom-scrollbar">
          <div>
            <strong className="text-white text-lg block mb-1">1. Aceitação dos Termos</strong>
            <p>Ao criar uma conta no VagaLink, você concorda com a coleta e uso de dados relacionados ao estacionamento no campus.</p>
          </div>
          
          <div>
            <strong className="text-white text-lg block mb-1">2. Uso do Sistema</strong>
            <p>O sistema visa facilitar a busca por vagas, porém não garante a reserva ou a disponibilidade exata no momento da chegada física, devido ao fluxo contínuo de veículos.</p>
          </div>
          
          <div>
            <strong className="text-white text-lg block mb-1">3. Privacidade de Dados</strong>
            <p>Seu e-mail institucional será utilizado apenas para fins de autenticação e comunicação sobre o sistema, não sendo comercializado ou compartilhado com terceiros sob nenhuma hipótese.</p>
          </div>
          
          <div>
            <strong className="text-white text-lg block mb-1">4. Limitação de Responsabilidade</strong>
            <p>O VagaLink e seus desenvolvedores não se responsabilizam por furtos, danos a veículos ou quaisquer incidentes ocorridos no estacionamento da instituição. O aplicativo é estritamente uma ferramenta de monitoramento.</p>
          </div>
        </div>

        <div className="flex-none mt-6 pt-4 border-t border-zinc-800">
          <Link 
            to="/login"
            className="flex justify-center items-center w-full md:w-auto md:inline-flex px-8 py-3 bg-vaga-green text-vaga-dark font-bold text-base rounded-lg hover:brightness-110 transition-all active:scale-[0.98]"
          >
            Concordar e Voltar
          </Link>
        </div>

      </div>
    </div>
  )
}