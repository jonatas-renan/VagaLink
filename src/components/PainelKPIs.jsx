import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { todasAsVagas } from '../vagasData'

// ── Configuração ─────────────────────────────────────────────────────────
// Mantenha DISTANCIA_OCUPADO_CM e SENSORES iguais aos de Dashboard.jsx.
const DISTANCIA_OCUPADO_CM = 150
const SENSORES = [
  { id: 1, setor: 'Setor A', vagaId: 'curva_1794014365239_12' },
  { id: 2, setor: 'Setor E', vagaId: 'curva_1794014751825_6' },
  { id: 3, setor: 'Setor L', vagaId: 'curva_1794015118527_25' },
  { id: 4, setor: 'Setor Q', vagaId: 'curva_1794015602042_4' },
]
const FUSO = 'America/Sao_Paulo'
const DIAS_ANALISE = 7
const JANELA = { inicio: 6, fim: 22 } // horas consideradas em "pico" e "mais livre" (06h–23h)
const MIN_AMOSTRAS = 30 // leituras válidas mínimas para um horário/dia valer como KPI
const OFFLINE_APOS_MS = 2 * 60 * 1000
const HORAS = Array.from({ length: 24 }, (_, h) => h)

const COR = {
  ocupada: '#ef4444',
  livre: '#22c55e',
  destaque: '#3987e5',
  neutra: '#52525b',
  grade: '#27272a',
  semDados: '#1c1c1c',
}
// Escala sequencial de um só tom (azul): escuro = pouco ocupado, claro = muito ocupado
const ESCALA = ['#0d366b', '#104281', '#184f95', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#5598e7', '#6da7ec', '#86b6ef']

// ── Helpers ──────────────────────────────────────────────────────────────
const pct = (o, v) => (v > 0 ? (o / v) * 100 : null)
const fmtPct = (p) => (p === null || p === undefined ? '—' : `${Math.round(p)}%`)
const hh = (h) => String(h % 24).padStart(2, '0')
const faixa = (h) => `${hh(h)}h–${hh(h + 1)}h`
const corEscala = (p) => ESCALA[Math.min(ESCALA.length - 1, Math.max(0, Math.round((p / 100) * (ESCALA.length - 1))))]
const nomeVaga = (id) => todasAsVagas.find((v) => v.id === id)?.nome ?? ''

function chaveHoje(agoraMs) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date(agoraMs))
}

function ultimosDias(hoje, n) {
  const [y, m, d] = hoje.split('-').map(Number)
  return Array.from({ length: n }, (_, i) =>
    new Date(Date.UTC(y, m - 1, d - (n - 1 - i))).toISOString().slice(0, 10)
  )
}

function rotuloDia(chave, longo = false) {
  const [y, m, d] = chave.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const sem = new Intl.DateTimeFormat('pt-BR', { weekday: longo ? 'long' : 'short', timeZone: 'UTC' })
    .format(dt)
    .replace('.', '')
  return `${sem} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

function haQuanto(ms, agora) {
  const s = Math.max(0, Math.round((agora - ms) / 1000))
  if (s < 60) return `há ${s} s`
  if (s < 3600) return `há ${Math.round(s / 60)} min`
  if (s < 86400) return `há ${Math.round(s / 3600)} h`
  return `há ${Math.round(s / 86400)} d`
}

function useAgora(intervaloMs) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs])
  return agora
}

function ComTooltip({ children }) {
  const ref = useRef(null)
  const [tip, setTip] = useState(null)
  const mostrar = (texto) => (e) => {
    const caixa = ref.current?.getBoundingClientRect()
    if (!caixa) return
    const r = e.currentTarget.getBoundingClientRect()
    setTip({ texto, x: r.left - caixa.left + r.width / 2, y: r.top - caixa.top })
  }
  const esconder = () => setTip(null)
  return (
    <div ref={ref} className="relative">
      {children({ mostrar, esconder })}
      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 -mt-2 -translate-x-1/2 -translate-y-full whitespace-pre rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.texto}
        </div>
      )}
    </div>
  )
}

// ── Agregação do histórico (linhas da função kpi_ocupacao_semana) ────────
function agregar(linhas, dias) {
  const permitidos = new Set(dias)
  const porHora = HORAS.map(() => ({ leituras: 0, validas: 0, ocupadas: 0 }))
  const celulas = new Map()
  const porDia = new Map(dias.map((d) => [d, { validas: 0, ocupadas: 0 }]))
  const porSensor = new Map(SENSORES.map((s) => [s.id, { leituras: 0, validas: 0, ocupadas: 0 }]))
  const total = { leituras: 0, validas: 0, ocupadas: 0 }

  for (const l of linhas) {
    if (!permitidos.has(l.dia)) continue
    const h = porHora[l.hora]
    h.leituras += l.leituras
    h.validas += l.validas
    h.ocupadas += l.ocupadas

    const chave = `${l.dia}|${l.hora}`
    const c = celulas.get(chave) ?? { validas: 0, ocupadas: 0 }
    c.validas += l.validas
    c.ocupadas += l.ocupadas
    celulas.set(chave, c)

    const d = porDia.get(l.dia)
    d.validas += l.validas
    d.ocupadas += l.ocupadas

    const s = porSensor.get(l.sensor_id)
    if (s) {
      s.leituras += l.leituras
      s.validas += l.validas
      s.ocupadas += l.ocupadas
    }

    total.leituras += l.leituras
    total.validas += l.validas
    total.ocupadas += l.ocupadas
  }

  const horas = HORAS.map((hora) => ({ hora, ...porHora[hora], pct: pct(porHora[hora].ocupadas, porHora[hora].validas) }))
  const candidatas = horas.filter((x) => x.hora >= JANELA.inicio && x.hora <= JANELA.fim && x.validas >= MIN_AMOSTRAS)
  const pico = candidatas.length ? candidatas.reduce((a, b) => (b.pct > a.pct ? b : a)) : null
  const maisLivre = candidatas.length ? candidatas.reduce((a, b) => (b.pct < a.pct ? b : a)) : null

  const diasComDados = dias
    .map((dia) => ({ dia, ...porDia.get(dia), pct: pct(porDia.get(dia).ocupadas, porDia.get(dia).validas) }))
    .filter((x) => x.validas >= MIN_AMOSTRAS)
  const diaCheio = diasComDados.length ? diasComDados.reduce((a, b) => (b.pct > a.pct ? b : a)) : null

  return { horas, celulas, porSensor, total, pico, maisLivre, diaCheio, pctMedia: pct(total.ocupadas, total.validas) }
}

// ── Peças visuais ────────────────────────────────────────────────────────
function Tile({ rotulo, valor, detalhe, hero = false, className = '', marcador = null }) {
  return (
    <section className={`rounded-2xl border border-zinc-800 bg-vaga-card p-4 ${className}`}>
      <p className="text-xs font-medium text-zinc-400">{rotulo}</p>
      <p className={`mt-1 flex items-center gap-2 font-black tracking-tight text-white ${hero ? 'text-5xl md:text-6xl' : 'text-3xl'}`}>
        {marcador && <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full" style={{ background: marcador }} />}
        {valor}
      </p>
      {detalhe && <p className="mt-1 text-xs text-zinc-400">{detalhe}</p>}
    </section>
  )
}

function Cartao({ titulo, subtitulo, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-zinc-800 bg-vaga-card p-4 md:p-5 ${className}`}>
      <h2 className="text-sm font-bold text-white">{titulo}</h2>
      {subtitulo && <p className="mb-4 mt-0.5 text-xs text-zinc-400">{subtitulo}</p>}
      {children}
    </section>
  )
}

function GraficoHoras({ horas, pico }) {
  return (
    <ComTooltip>
      {(t) => (
      <>
      <div className="relative mt-5 h-48">
        {[0, 50, 100].map((v) => (
          <Fragment key={v}>
            <div className="absolute left-9 right-0 border-t" style={{ bottom: `${v}%`, borderColor: COR.grade }} />
            <span className="absolute left-0 w-7 -translate-y-1/2 text-right text-[11px] text-zinc-500" style={{ bottom: `${v}%` }}>
              {v}%
            </span>
          </Fragment>
        ))}
        <div className="absolute inset-y-0 left-9 right-0 flex items-end gap-[2px]">
          {horas.map((x) => {
            const ehPico = pico && x.hora === pico.hora
            const texto =
              x.pct === null
                ? `${faixa(x.hora)}\nsem dados`
                : `${faixa(x.hora)}\n${fmtPct(x.pct)} ocupadas\n${x.validas.toLocaleString('pt-BR')} leituras`
            return (
              <div
                key={x.hora}
                tabIndex={0}
                aria-label={texto.replaceAll('\n', ', ')}
                onMouseEnter={t.mostrar(texto)}
                onFocus={t.mostrar(texto)}
                onMouseLeave={t.esconder}
                onBlur={t.esconder}
                className="flex h-full flex-1 flex-col items-center justify-end outline-none focus-visible:bg-white/5"
              >
                {ehPico && x.pct > 0 && <span className="mb-1 text-[11px] font-semibold text-white">{fmtPct(x.pct)}</span>}
                <div
                  className="w-full rounded-t-[4px]"
                  style={{ maxWidth: 24, height: `${x.pct ?? 0}%`, background: ehPico ? COR.destaque : COR.neutra }}
                />
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex pl-9">
        {horas.map((x) => (
          <span key={x.hora} className="flex-1 whitespace-nowrap text-center text-[11px] text-zinc-500">
            {x.hora % 3 === 0 ? `${x.hora}h` : ''}
          </span>
        ))}
      </div>
      </>
      )}
    </ComTooltip>
  )
}

function MapaDeCalor({ dias, celulas }) {
  return (
    <ComTooltip>
      {(t) => (
      <>
      <div className="overflow-x-auto">
        <div className="min-w-[640px]" role="img" aria-label="Mapa de calor da ocupação por dia e hora. Os mesmos dados estão na tabela abaixo do gráfico de horas.">
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: '5.5rem repeat(24, minmax(0, 1fr))' }}>
            <div />
            {HORAS.map((h) => (
              <div key={h} className="text-center text-[11px] text-zinc-500">
                {h % 3 === 0 ? `${h}h` : ''}
              </div>
            ))}
            {dias.map((dia) => (
              <Fragment key={dia}>
                <div className="flex items-center pr-2 text-xs text-zinc-400">{rotuloDia(dia)}</div>
                {HORAS.map((h) => {
                  const c = celulas.get(`${dia}|${h}`)
                  const p = c ? pct(c.ocupadas, c.validas) : null
                  const texto = p === null ? `${rotuloDia(dia, true)} · ${faixa(h)}\nsem dados` : `${rotuloDia(dia, true)} · ${faixa(h)}\n${fmtPct(p)} ocupadas`
                  return (
                    <div
                      key={h}
                      className="h-7 rounded-[3px]"
                      style={{ background: p === null ? COR.semDados : corEscala(p) }}
                      onMouseEnter={t.mostrar(texto)}
                      onMouseLeave={t.esconder}
                    />
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-zinc-400">
        <span className="flex items-center gap-2">
          menos ocupado
          <span className="flex gap-[2px]">
            {ESCALA.map((c) => (
              <span key={c} className="h-3 w-4 rounded-[2px]" style={{ background: c }} />
            ))}
          </span>
          mais ocupado
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-4 rounded-[2px] border border-zinc-700" style={{ background: COR.semDados }} />
          sem dados
        </span>
      </div>
      </>
      )}
    </ComTooltip>
  )
}

function BarraDivisao({ rotulo, ocupadas, livres }) {
  const total = ocupadas + livres
  if (!total) return (
    <div>
      <p className="mb-2 text-xs text-zinc-400">{rotulo}</p>
      <p className="text-sm text-zinc-500">Sem dados</p>
    </div>
  )
  const pO = (ocupadas / total) * 100
  const pL = 100 - pO
  return (
    <div>
      <p className="mb-2 text-xs text-zinc-400">{rotulo}</p>
      <div className="flex h-7 gap-[2px]" role="img" aria-label={`${Math.round(pO)}% com carro e ${Math.round(pL)}% livres`}>
        {pO > 0 && (
          <div className="flex items-center rounded px-2 text-xs font-semibold text-white" style={{ width: `${pO}%`, background: COR.ocupada }}>
            {pO >= 14 ? `${Math.round(pO)}%` : ''}
          </div>
        )}
        {pL > 0 && (
          <div className="flex items-center rounded px-2 text-xs font-semibold" style={{ width: `${pL}%`, background: COR.livre, color: '#0b0b0b' }}>
            {pL >= 14 ? `${Math.round(pL)}%` : ''}
          </div>
        )}
      </div>
    </div>
  )
}

function Aviso({ tom = 'info', children }) {
  const estilos = {
    info: 'border-zinc-700 bg-zinc-900/60 text-zinc-300',
    alerta: 'border-amber-700/60 bg-amber-950/40 text-amber-200',
    erro: 'border-red-800/70 bg-red-950/40 text-red-200',
  }
  return <div className={`rounded-xl border px-4 py-3 text-xs leading-relaxed ${estilos[tom]}`}>{children}</div>
}

// ── Página ───────────────────────────────────────────────────────────────
export default function PainelKPIs({ user }) {
  const agora = useAgora(10000)
  const [vivo, setVivo] = useState([])
  const [vivoCarregado, setVivoCarregado] = useState(false)
  const [erroVivo, setErroVivo] = useState(null)
  const [linhas, setLinhas] = useState([])
  const [semanaCarregada, setSemanaCarregada] = useState(false)
  const [erroSemana, setErroSemana] = useState(null)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const { data, error } = await supabase.from('sensores').select('sensor_id, distancia_cm, updated_at')
      if (!ativo) return
      if (error) setErroVivo(error.message)
      else {
        setErroVivo(null)
        setVivo(data ?? [])
      }
      setVivoCarregado(true)
    }
    carregar()
    const id = setInterval(carregar, 10000)
    return () => {
      ativo = false
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const { data, error } = await supabase.rpc('kpi_ocupacao_semana', {
        p_dias: DIAS_ANALISE + 1,
        p_limite_cm: DISTANCIA_OCUPADO_CM,
      })
      if (!ativo) return
      if (error) setErroSemana(error)
      else {
        setErroSemana(null)
        setLinhas(data ?? [])
      }
      setSemanaCarregada(true)
    }
    carregar()
    const id = setInterval(carregar, 60000)
    return () => {
      ativo = false
      clearInterval(id)
    }
  }, [])

  const hoje = chaveHoje(agora)
  const dias = useMemo(() => ultimosDias(hoje, DIAS_ANALISE), [hoje])
  const semana = useMemo(() => agregar(linhas, dias), [linhas, dias])

  // Agora (tabela sensores)
  const vivoPorId = new Map(vivo.map((r) => [r.sensor_id, r]))
  const leituras = SENSORES.map((s) => {
    const d = vivoPorId.get(s.id)?.distancia_cm
    const valida = d !== null && d !== undefined && d > 0
    return { ...s, d: valida ? d : null, valida, ocupada: valida && d < DISTANCIA_OCUPADO_CM }
  })
  const validasAgora = leituras.filter((l) => l.valida).length
  const ocupadasAgora = leituras.filter((l) => l.ocupada).length
  const ultimaMs = vivo.reduce((m, r) => Math.max(m, new Date(r.updated_at).getTime() || 0), 0)
  const online = ultimaMs > 0 && agora - ultimaMs < OFFLINE_APOS_MS

  const totalVagas = todasAsVagas.length
  const cobertura = (SENSORES.length / totalVagas) * 100
  const temHistorico = semana.total.validas > 0
  const livresSemana = semana.total.validas - semana.total.ocupadas

  return (
    <div className="min-h-[100dvh] bg-vaga-dark font-sans text-white">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-800 bg-vaga-card p-4 shadow-md">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-sm font-semibold text-zinc-400 transition-colors hover:text-white">
            ← Mapa
          </Link>
          <span aria-hidden="true" className="text-zinc-700">|</span>
          <h1 className="text-lg font-extrabold">
            Painel de <span className="text-vaga-green">KPIs</span>
          </h1>
        </div>
        <span className="hidden text-xs font-semibold text-zinc-500 md:inline">{user?.email}</span>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
        <Aviso>
          Os números abaixo vêm das <strong>{SENSORES.length} vagas com sensor</strong> ({SENSORES.map((s) => s.setor).join(', ')}), que
          são {cobertura.toFixed(1).replace('.', ',')}% das {totalVagas} vagas do estacionamento. Eles mostram o comportamento dessas vagas,
          não uma contagem do estacionamento inteiro.
        </Aviso>

        {erroVivo && <Aviso tom="erro">Não foi possível ler a tabela <code>sensores</code>: {erroVivo}</Aviso>}
        {vivoCarregado && !erroVivo && vivo.length === 0 && (
          <Aviso tom="alerta">
            A tabela <code>sensores</code> voltou vazia. Se ela tem linhas no Supabase, falta a política de leitura para usuários logados:
            rode o arquivo <code>supabase/kpis.sql</code> no SQL Editor.
          </Aviso>
        )}
        {erroSemana && (
          <Aviso tom="erro">
            {erroSemana.code === 'PGRST202'
              ? <>A função <code>kpi_ocupacao_semana</code> ainda não existe no Supabase. Rode o arquivo <code>supabase/kpis.sql</code> no SQL Editor e recarregue.</>
              : <>Não foi possível carregar o histórico: {erroSemana.message}</>}
          </Aviso>
        )}
        {semanaCarregada && !erroSemana && !temHistorico && (
          <Aviso tom="alerta">
            Ainda não há histórico válido nos últimos {DIAS_ANALISE} dias. O histórico grava uma vez por minuto, só quando o ESP32 está enviando
            leituras de sensores que funcionam.
          </Aviso>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile
            hero
            className="col-span-2"
            rotulo={`Horário de pico · últimos ${DIAS_ANALISE} dias`}
            valor={semana.pico && semana.pico.pct > 0 ? faixa(semana.pico.hora) : '—'}
            detalhe={
              !semana.pico
                ? `Coletando dados: cada horário precisa de ao menos ${MIN_AMOSTRAS} leituras válidas.`
                : semana.pico.pct > 0
                  ? `${fmtPct(semana.pico.pct)} das vagas monitoradas ocupadas, em média, entre ${hh(JANELA.inicio)}h e ${hh(JANELA.fim + 1)}h.`
                  : 'Nenhuma vaga monitorada foi ocupada no período.'
            }
          />
          <Tile
            rotulo="Com carro agora"
            valor={validasAgora ? `${ocupadasAgora} de ${validasAgora}` : '—'}
            detalhe={
              validasAgora
                ? `${fmtPct(pct(ocupadasAgora, validasAgora))} das vagas monitoradas${validasAgora < SENSORES.length ? ` · ${SENSORES.length - validasAgora} sem leitura` : ''}${!online ? ' · dados desatualizados' : ''}`
                : 'Nenhum sensor com leitura'
            }
          />
          <Tile
            rotulo="Sensores (ESP32)"
            valor={!vivoCarregado ? '…' : online ? 'Online' : 'Offline'}
            marcador={!vivoCarregado ? null : online ? COR.livre : COR.ocupada}
            detalhe={ultimaMs ? `Última leitura ${haQuanto(ultimaMs, agora)}` : 'Sem leitura registrada'}
          />
          <Tile
            rotulo="Horário mais livre"
            valor={semana.maisLivre ? faixa(semana.maisLivre.hora) : '—'}
            detalhe={semana.maisLivre ? `${fmtPct(semana.maisLivre.pct)} ocupadas, em média` : 'Coletando dados'}
          />
          <Tile
            rotulo={`Ocupação média · ${DIAS_ANALISE} dias`}
            valor={fmtPct(semana.pctMedia)}
            detalhe={temHistorico ? 'das vagas monitoradas, em qualquer horário' : 'Coletando dados'}
          />
          <Tile
            rotulo="Dia mais cheio"
            valor={semana.diaCheio ? rotuloDia(semana.diaCheio.dia) : '—'}
            detalhe={semana.diaCheio ? `${fmtPct(semana.diaCheio.pct)} de ocupação média` : 'Coletando dados'}
          />
          <Tile
            rotulo="Leituras válidas"
            valor={fmtPct(pct(semana.total.validas, semana.total.leituras))}
            detalhe={semana.total.leituras ? `${semana.total.leituras.toLocaleString('pt-BR')} leituras em ${DIAS_ANALISE} dias` : 'Sem leituras'}
          />
        </div>

        {/* Pico por hora + com carro x livres */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Cartao
            className="lg:col-span-2"
            titulo="Ocupação média por hora do dia"
            subtitulo={`Percentual de vagas monitoradas ocupadas em cada hora, média dos últimos ${DIAS_ANALISE} dias. Em azul, o horário de pico.`}
          >
            <GraficoHoras horas={semana.horas} pico={semana.pico && semana.pico.pct > 0 ? semana.pico : null} />
            <details className="mt-4 text-xs text-zinc-400">
              <summary className="cursor-pointer select-none hover:text-white">Ver dados por hora</summary>
              <table className="mt-2 w-full text-left">
                <thead className="text-zinc-500">
                  <tr><th className="py-1 font-medium">Hora</th><th className="font-medium">Ocupação</th><th className="font-medium">Leituras válidas</th></tr>
                </thead>
                <tbody>
                  {semana.horas.map((x) => (
                    <tr key={x.hora} className="border-t border-zinc-800">
                      <td className="py-1">{faixa(x.hora)}</td>
                      <td>{fmtPct(x.pct)}</td>
                      <td>{x.validas.toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </Cartao>

          <Cartao titulo="Com carro × livres" subtitulo="Só as vagas com sensor.">
            <div className="space-y-5">
              <BarraDivisao rotulo="Agora" ocupadas={ocupadasAgora} livres={validasAgora - ocupadasAgora} />
              <BarraDivisao rotulo={`Média dos últimos ${DIAS_ANALISE} dias`} ocupadas={semana.total.ocupadas} livres={livresSemana} />
              <div className="flex gap-4 text-xs text-zinc-300">
                <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: COR.ocupada }} />Com carro</span>
                <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: COR.livre }} />Livres</span>
              </div>
            </div>
          </Cartao>
        </div>

        {/* Mapa de calor */}
        <Cartao
          titulo="Quando o estacionamento enche"
          subtitulo="Ocupação por dia e hora nos últimos 7 dias. Passe o mouse sobre um bloco para ver o valor."
        >
          <MapaDeCalor dias={dias} celulas={semana.celulas} />
        </Cartao>

        {/* Por sensor */}
        <Cartao titulo="Por sensor" subtitulo="Situação atual e comportamento dos últimos 7 dias.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="py-2 font-medium">Vaga</th>
                  <th className="font-medium">Agora</th>
                  <th className="font-medium">Distância</th>
                  <th className="font-medium">Ocupação (7 dias)</th>
                  <th className="font-medium">Leituras válidas</th>
                </tr>
              </thead>
              <tbody>
                {leituras.map((l) => {
                  const s = semana.porSensor.get(l.id)
                  const p = pct(s.ocupadas, s.validas)
                  return (
                    <tr key={l.id} className="border-t border-zinc-800">
                      <td className="py-3">
                        <span className="font-semibold">{l.setor}</span>
                        <span className="ml-2 text-xs text-zinc-500">{nomeVaga(l.vagaId)} · sensor {l.id}</span>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-2 text-xs font-semibold">
                          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: !l.valida ? COR.neutra : l.ocupada ? COR.ocupada : COR.livre }} />
                          {!l.valida ? 'Sem leitura' : l.ocupada ? 'Com carro' : 'Livre'}
                        </span>
                      </td>
                      <td className="text-zinc-300">{l.valida ? `${Math.round(l.d)} cm` : '—'}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full" style={{ background: ESCALA[1] }}>
                            <div className="h-2 rounded-full" style={{ width: `${p ?? 0}%`, background: COR.destaque }} />
                          </div>
                          <span className="text-xs text-zinc-300">{fmtPct(p)}</span>
                        </div>
                      </td>
                      <td className="text-zinc-300">{fmtPct(pct(s.validas, s.leituras))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Cartao>

        <p className="pb-6 text-[11px] leading-relaxed text-zinc-500">
          Como calculamos: uma vaga conta como ocupada quando o sensor mede menos de {DISTANCIA_OCUPADO_CM} cm, o mesmo critério do mapa. Leituras
          vazias ou zeradas ficam fora da conta. O histórico guarda uma leitura por sensor por minuto. Horários em {FUSO.replace('_', ' ')}. Pico
          e horário mais livre consideram {hh(JANELA.inicio)}h–{hh(JANELA.fim + 1)}h e horários com ao menos {MIN_AMOSTRAS} leituras válidas.
        </p>
      </main>
    </div>
  )
}
