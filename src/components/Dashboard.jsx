import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Polygon, Popup, ZoomControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { todasAsVagas } from '../vagasData'
import { supabase } from '../supabaseClient' 

const SENSOR_VAGA_MAP = {
  1: 'curva_1794014365239_12', // Setor A
  2: 'curva_1794014751825_6',  // Setor E
  3: 'curva_1794015118527_25', // Setor L
  4: 'curva_1794015602042_4',  // Setor Q
}

const DISTANCIA_OCUPADO_CM = 150 

export default function Dashboard({ user, onLogout }) {
  const facensCenter = [-23.4701261, -47.4297037]
  const limitesMapa = [
    [-23.475000, -47.435000],
    [-23.465000, -47.422000] 
  ]
  
  const [vagas, setVagas] = useState(todasAsVagas)

  useEffect(() => {
    const fetchSensores = async () => {
      console.log("⏱️ Buscando dados...", new Date().toLocaleTimeString())

      const { data, error } = await supabase
        .from('sensores')
        .select('sensor_id, distancia_cm')

      if (error) {
        console.error("🚨 Erro Supabase:", error)
        return
      }

      if (data) {
        setVagas(vagasAtuais => 
          vagasAtuais.map(vaga => {
            const sensorEntry = Object.entries(SENSOR_VAGA_MAP).find(([sId, vId]) => vId === vaga.id)
            
            if (sensorEntry) {
              const sensorIdBanco = parseInt(sensorEntry[0])
              const sensorData = data.find(d => d.sensor_id === sensorIdBanco)
              
              if (sensorData) {
                const estaOcupada = sensorData.distancia_cm !== null && 
                                    sensorData.distancia_cm > 0 && 
                                    sensorData.distancia_cm < DISTANCIA_OCUPADO_CM
                
                return { 
                  ...vaga, 
                  ocupada: estaOcupada, 
                  temSensor: true, 
                  sensorId: sensorIdBanco, 
                  distanciaAtual: sensorData.distancia_cm 
                }
              }
            }
            return vaga
          })
        )
      }
    }

    fetchSensores()
    const intervalId = setInterval(fetchSensores, 5000)

    return () => clearInterval(intervalId) 
  }, [])

  const vagasLivres = vagas.filter(v => !v.ocupada).length
  const vagasOcupadas = vagas.filter(v => v.ocupada).length

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-vaga-dark overflow-hidden font-sans relative">
      
      <header className="bg-vaga-card border-b border-zinc-800 p-4 flex justify-between items-center z-[2500] shadow-md relative shrink-0">
        <div className="flex items-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-vaga-green">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 12 10s-6.7.6-8.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
           </svg>
           <h1 className="text-xl font-extrabold text-white">Vaga<span className="text-vaga-green">Link</span></h1>
        </div>
        <div className="flex items-center gap-4">
           <span className="hidden md:inline-block text-xs font-semibold text-zinc-500">{user?.email}</span>
           <button onClick={onLogout} className="text-sm font-semibold text-zinc-400 hover:text-red-500 cursor-pointer transition-colors">Sair</button>
        </div>
      </header>

      <main className="flex-1 relative z-0 overflow-hidden">
        <MapContainer 
          center={facensCenter} 
          zoom={17} 
          minZoom={16} 
          maxZoom={24} 
          maxBounds={limitesMapa}
          maxBoundsViscosity={1.0}
          className="absolute inset-0 w-full h-full z-0" 
          zoomControl={false}
        >
          <TileLayer 
            attribution='&copy; OpenStreetMap' 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            maxNativeZoom={19} 
            maxZoom={24} 
          />
          
          <ZoomControl position="topright" />

          {vagas.map((vaga) => (
            <Polygon
              key={`${vaga.id}-${vaga.ocupada}`} 
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
                  
                  {vaga.temSensor && (
                    <p className="text-[10px] uppercase tracking-wider text-blue-600 font-bold mb-2">📡 Sensor {vaga.sensorId}</p>
                  )}

                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${vaga.ocupada ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                    {vaga.ocupada ? 'Vaga Ocupada' : 'Vaga Disponível'}
                  </div>

                  {vaga.temSensor && (
                    <p className="text-[10px] text-gray-500 mt-2 font-mono">Leitura Atual: {vaga.distanciaAtual} cm</p>
                  )}
                </div>
              </Popup>
            </Polygon>
          ))}
        </MapContainer>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-vaga-card/95 backdrop-blur-md border border-zinc-700 p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-11/12 max-w-sm flex justify-around z-[1000]">
           <div className="text-center w-1/2">
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">Livres</p>
              <p className="text-3xl font-black text-vaga-green">{vagasLivres}</p>
           </div>
           
           <div className="w-px bg-zinc-700 rounded my-1"></div>
           
           <div className="text-center w-1/2">
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">Ocupadas</p>
              <p className="text-3xl font-black text-red-500">{vagasOcupadas}</p>
           </div>
        </div>
      </main>
    </div>
  )
}