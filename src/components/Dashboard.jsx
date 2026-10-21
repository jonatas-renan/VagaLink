import { useState } from 'react'
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export default function Dashboard({ user, onLogout }) {
  // Coordenada central (aponta para o meio da Facens para a câmera abrir no lugar certo)
  const facensCenter = [-23.4701261, -47.4297037]

  // Estado das vagas usando Polígonos (4 pontos = Retângulo)
  // Depois, quando o Supabase estiver pronto, os dados de ocupação virão dele!
  const [vagas, setVagas] = useState([
    { 
      id: 1, 
      nome: 'Estacionamento Prédio C / FMLab', 
      ocupada: false,
      area: [
        [-23.469406, -47.429210], // Topo Esquerdo
        [-23.469611, -47.428738], // Topo Direito
        [-23.469722, -47.428744], // Baixo Direito
        [-23.469446, -47.429326], // Baixo Esquerdo
      ] 
    },
    { 
      id: 2, 
      nome: 'Vagas Prédio D', 
      ocupada: true,
      area: [
        [-23.4695, -47.4310], 
        [-23.4695, -47.4306], 
        [-23.4698, -47.4306], 
        [-23.4698, -47.4310], 
      ]
    },
    { 
      id: 3, 
      nome: 'Estacionamento Prédio L', 
      ocupada: false,
      area: [
        [-23.4700, -47.4285], 
        [-23.4700, -47.4280], 
        [-23.4704, -47.4280], 
        [-23.4704, -47.4285], 
      ]
    },
    { 
      id: 4, 
      nome: 'Vagas Smart Campus / Prédio A', 
      ocupada: true,
      area: [
        [-23.4710, -47.4295], 
        [-23.4710, -47.4290], 
        [-23.4714, -47.4290], 
        [-23.4714, -47.4295], 
      ]
    },
  ])

  return (
    <div className="h-screen w-screen flex flex-col bg-vaga-dark overflow-hidden font-sans">
      
      {/* HEADER SUPERIOR */}
      <header className="bg-vaga-card border-b border-zinc-800 p-4 flex justify-between items-center z-[1000] shadow-md">
        <div className="flex items-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-vaga-green">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 12 10s-6.7.6-8.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
           </svg>
           <h1 className="text-xl font-extrabold text-white">Vaga<span className="text-vaga-green">Link</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Mostra o e-mail do usuário no canto superior direito */}
           <span className="hidden md:inline-block text-xs font-semibold text-zinc-500">
             {user?.email}
           </span>
           <button 
             onClick={onLogout}
             className="text-sm font-semibold text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
           >
             Sair
           </button>
        </div>
      </header>

      {/* ÁREA DO MAPA */}
      <main className="flex-1 relative z-0">
        <MapContainer 
          center={facensCenter} 
          zoom={17}
          className="h-full w-full z-0"
          zoomControl={false} 
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Renderiza um retângulo (Polígono) para cada área de vaga */}
          {vagas.map((vaga) => (
            <Polygon
              key={vaga.id}
              positions={vaga.area}
              pathOptions={{ 
                color: vaga.ocupada ? '#ef4444' : '#22c55e', 
                fillColor: vaga.ocupada ? '#ef4444' : '#22c55e',
                fillOpacity: 0.45,
                weight: 2 
              }}
            >
              <Popup>
                <div className="text-center font-sans p-1">
                  <h3 className="font-bold text-gray-800 text-sm mb-1">{vaga.nome}</h3>
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${vaga.ocupada ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                    {vaga.ocupada ? 'Vagas Esgotadas' : 'Vagas Disponíveis'}
                  </div>
                </div>
              </Popup>
            </Polygon>
          ))}
        </MapContainer>

        {/* PAINEL FLUTUANTE INFERIOR (Contador de Vagas) */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-vaga-card/95 backdrop-blur-md border border-zinc-700 p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-11/12 max-w-sm flex justify-around z-[1000]">
           <div className="text-center w-1/2">
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">Livres</p>
              <p className="text-3xl font-black text-vaga-green">
                 {vagas.filter(v => !v.ocupada).length}
              </p>
           </div>
           
           <div className="w-px bg-zinc-700 rounded my-1"></div>
           
           <div className="text-center w-1/2">
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">Ocupadas</p>
              <p className="text-3xl font-black text-red-500">
                 {vagas.filter(v => v.ocupada).length}
              </p>
           </div>
        </div>
      </main>
    </div>
  )
}