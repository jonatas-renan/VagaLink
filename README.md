# VagaLink

Mostra em tempo real quais vagas do estacionamento estão livres ou ocupadas. Sensores ultrassônicos ligados a um ESP32 enviam as distâncias por Wi-Fi para o Supabase, e o app exibe tudo num mapa e num painel de KPIs.

Projeto da UPX, Engenharia da Computação, Facens (Sorocaba/SP).

> **Estado atual:** protótipo com **4 vagas monitoradas** (Setores A, E, L e Q) de um mapa com 268 vagas. O objetivo é escalar para o estacionamento inteiro.

## Como funciona

```
4 sensores HC-SR04 ──► ESP32 ──Wi-Fi / HTTPS──► Supabase ──► App VagaLink (web e Android)
                                                  │             ├─ Mapa com vagas livres/ocupadas
                                  sensores (ao vivo, 4 linhas)  └─ Painel de KPIs (/admin)
                                  historico (1 leitura/min, via pg_cron)
```

1. O ESP32 mede a distância de cada sensor cerca de uma vez por segundo e atualiza a tabela `sensores` (upsert nas 4 linhas fixas).
2. Uma vaga conta como **ocupada** quando o sensor mede menos de **150 cm** (e mais de 0).
3. Um job do `pg_cron` copia os valores para a tabela `historico` a cada minuto, só se o ESP32 enviou nos últimos 2 minutos.
4. O app lê `sensores` a cada 5 s para pintar o mapa. O painel lê `sensores` a cada 10 s e o resumo do histórico a cada 60 s.

## Funcionalidades

- Mapa do estacionamento (Leaflet) com cada vaga em verde (livre) ou vermelho (ocupada), com popup de detalhes.
- Contador de vagas livres e ocupadas.
- Login e cadastro com Supabase Auth.
- **Painel de KPIs** (só admin): horário de pico dos últimos 7 dias, horário mais livre, dia mais cheio, ocupação média, mapa de calor por dia e hora, divisão "com carro × livres", tabela por sensor e status do ESP32.
- App Android empacotado com Capacitor (APK gerado pelo GitHub Actions).

## Tecnologias

| Camada | Tecnologias |
|---|---|
| App | React 19, Vite, Tailwind CSS 4, React Router, Leaflet / react-leaflet |
| Mobile | Capacitor (Android) |
| Backend | Supabase (Auth, Postgres com RLS, API REST, pg_cron) |
| Hardware | ESP32 (Arduino IDE), sensores ultrassônicos HC-SR04 |

## Estrutura do projeto

```
VagaLink/
├─ src/
│  ├─ App.jsx                  # rotas e controle de sessão/perfil
│  ├─ supabaseClient.js        # cliente do Supabase (lê o .env)
│  ├─ vagasData.js             # polígonos das 268 vagas (Setores A a S)
│  └─ components/
│     ├─ Dashboard.jsx         # mapa em tempo real
│     ├─ PainelKPIs.jsx        # painel de KPIs (/admin)
│     ├─ Login.jsx, Beneficios.jsx, Termos.jsx
├─ supabase/kpis.sql           # função de KPIs e políticas de leitura
├─ firmware/vagalink_esp32/    # código do ESP32 (Arduino)
├─ android/                    # projeto Android (Capacitor)
├─ .github/workflows/build-apk.yml
├─ .env.example                # modelo das variáveis de ambiente
└─ capacitor.config.json
```

## Pré-requisitos

- [Node.js](https://nodejs.org) 20.19 ou superior (o CI usa a versão 24) e npm
- Git
- Um projeto no [Supabase](https://supabase.com)
- Para o hardware: Arduino IDE, ESP32 (modelo DevKit) e 4 sensores HC-SR04
- Para o Android: Android Studio (traz o JDK necessário)

## Rodando o app

```bash
git clone https://github.com/jonatas-renan/VagaLink.git
cd VagaLink
npm install
```

Crie o arquivo `.env` na raiz a partir do modelo e preencha com os dados do seu projeto Supabase:

```bash
cp .env.example .env              # macOS / Linux / Git Bash
# PowerShell: Copy-Item .env.example .env
```

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_XXXXXXXX
```

Os dois valores ficam em **Supabase → Project Settings → API Keys**. Use **somente** a chave *publishable* (ou a antiga *anon*). Nunca use `secret` ou `service_role` num app que roda no navegador. O `.env` já está no `.gitignore`, então não vai para o GitHub.

Depois, suba o servidor de desenvolvimento:

```bash
npm run dev
```

Abra o endereço que o terminal mostrar (normalmente `http://localhost:5173`). Se mudar o `.env`, pare o servidor (`Ctrl+C`) e rode `npm run dev` de novo, porque o Vite só lê o arquivo ao iniciar.

> Se o projeto estiver numa pasta do OneDrive, o `npm install` pode ficar lento ou travar. Prefira uma pasta fora dele, como `C:\dev\VagaLink`.

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento com recarga automática |
| `npm run build` | gera a versão de produção em `dist/` |
| `npm run preview` | serve o build localmente para teste |
| `npm run lint` | verifica o código com o ESLint |

## Configurando o Supabase

No **SQL Editor** do seu projeto, rode os dois passos abaixo, nesta ordem.

**Passo 1: tabelas, políticas e rotina do histórico**

<details>
<summary>Ver o SQL</summary>

```sql
-- Tabela "ao vivo": 4 linhas fixas, uma por sensor
create table if not exists sensores (
  sensor_id int primary key check (sensor_id between 1 and 4),
  distancia_cm real,
  updated_at timestamptz default now()
);

insert into sensores (sensor_id) values (1), (2), (3), (4)
on conflict do nothing;

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sensores_updated on sensores;
create trigger trg_sensores_updated
before update on sensores
for each row execute function set_updated_at();

-- Histórico: 1 linha por sensor por minuto
create table if not exists historico (
  id bigint generated always as identity primary key,
  sensor_id int not null references sensores(sensor_id),
  distancia_cm real,
  registrado_em timestamptz not null default now()
);

create index if not exists historico_sensor_tempo_idx
  on historico (sensor_id, registrado_em desc);

-- Segurança (RLS): o ESP32 escreve em "sensores"; o app só lê
alter table sensores enable row level security;
alter table historico enable row level security;

drop policy if exists "esp insere" on sensores;
drop policy if exists "esp atualiza" on sensores;
drop policy if exists "app le" on sensores;
drop policy if exists "app le historico" on historico;

create policy "esp insere" on sensores
  for insert to anon with check (true);
create policy "esp atualiza" on sensores
  for update to anon using (true) with check (true);
create policy "app le" on sensores
  for select to anon, authenticated using (true);
create policy "app le historico" on historico
  for select to anon, authenticated using (true);

-- Realtime na tabela ao vivo
do $$
begin
  alter publication supabase_realtime add table sensores;
exception when duplicate_object then null;
end $$;

-- Cópia para o histórico a cada minuto + limpeza diária (30 dias)
create extension if not exists pg_cron;

select cron.schedule('historico-1min', '* * * * *', $$
  insert into historico (sensor_id, distancia_cm)
  select sensor_id, distancia_cm
  from sensores
  where updated_at > now() - interval '2 minutes'
$$);

select cron.schedule('historico-limpeza', '0 3 * * *', $$
  delete from historico where registrado_em < now() - interval '30 days'
$$);
```

</details>

Se o `create extension pg_cron` der erro, ative em **Database → Extensions → pg_cron** e rode de novo.

**Passo 2: função dos KPIs**

Rode o conteúdo de [`supabase/kpis.sql`](supabase/kpis.sql). Ele cria a função `kpi_ocupacao_semana`, que resume o histórico por hora (evitando baixar dezenas de milhares de linhas), e reaplica as políticas de leitura para usuários logados.

**Conferindo**

- `select * from cron.job;` deve listar `historico-1min` e `historico-limpeza`.
- Com o ESP32 enviando, a tabela `historico` ganha 4 linhas por minuto.

### Criando um usuário admin

O botão **Painel Admin** só aparece para quem tem `role = 'admin'` na tabela `perfis`. Depois de criar a conta no app, pegue o UUID do usuário em **Authentication → Users** e rode:

```sql
update perfis set role = 'admin' where id = 'UUID_DO_USUARIO';
```

## ESP32 e sensores

### Ligações (HC-SR04 de 5 V)

| Sensor | TRIG (direto) | ECHO (pelo divisor de tensão) |
|---|---|---|
| 1 | GPIO 12 | GPIO 16 (RX2) |
| 2 | GPIO 13 | GPIO 17 (TX2) |
| 3 | GPIO 14 | GPIO 18 |
| 4 | GPIO 15 | GPIO 19 |

- **VCC** de todos os sensores no pino **VIN** (5 V) do ESP32, e **todos os GND juntos**.
- **Divisor de tensão em cada ECHO.** O ECHO sai a 5 V e os pinos do ESP32 aguentam só 3,3 V. Sem o divisor, a placa pode queimar.

```
ECHO do sensor ──[1 kΩ]──┬── GPIO do ESP32
                         │
                       [2 kΩ]
                         │
                        GND
```

- Aponte os sensores para direções diferentes, ou deixe alguns centímetros entre eles, para um não captar o eco do outro.

### Gravando o firmware

1. Instale a **Arduino IDE**.
2. Em **Ferramentas → Placa → Gerenciador de Placas**, instale **esp32 by Espressif Systems**.
3. Se o Windows não mostrar uma porta COM nova ao conectar a placa, instale o driver do chip USB (**CP210x** ou **CH340**, conforme a sua placa) e use um cabo USB que transfira dados.
4. Abra `firmware/vagalink_esp32/vagalink_esp32.ino` e preencha no topo do arquivo:
   - `WIFI_SSID` e `WIFI_PASS`: o ESP32 só conecta em rede **2,4 GHz** (hotspot de celular serve).
   - `URL`: `https://SEU_PROJETO.supabase.co/rest/v1/sensores?on_conflict=sensor_id`
   - `API_KEY`: a chave **publishable**.
5. Selecione **Placa: ESP32 Dev Module** e a **Porta** correta, e clique em **Carregar**. Se aparecer `Connecting...` e travar, segure o botão **BOOT** da placa até começar a gravar.
6. Abra o **Monitor Serial** em **115200**. Deve aparecer algo como:

```
Wi-Fi conectado
S1: 15.2 | S2: 80.4 | S3: -1.0 | S4: 120.9 cm
Envio: 201
```

`Envio: 200`, `201` ou `204` significa que gravou. `-1.0` significa sem eco naquele sensor (no banco vira `null`). **Nunca publique o `.ino` com a sua senha de Wi-Fi preenchida.**

## Rotas do app

| Rota | Acesso | O que mostra |
|---|---|---|
| `/login` | público | entrada e cadastro |
| `/beneficios`, `/termos` | público | páginas informativas |
| `/` | usuário logado | mapa em tempo real |
| `/admin` | usuário com `role = 'admin'` | painel de KPIs |

## Personalizando

- **Sensor → vaga:** o mapa usa `SENSOR_VAGA_MAP` em `src/components/Dashboard.jsx`, e o painel usa a lista `SENSORES` em `src/components/PainelKPIs.jsx`. Para monitorar outra vaga, atualize os dois.
- **Limite de ocupação:** `DISTANCIA_OCUPADO_CM` (150 cm) existe nos dois arquivos. Mantenha os valores iguais.
- **Intervalo do histórico:** troque a agenda do job `historico-1min` no Supabase. Se aumentar o intervalo, ajuste `MIN_AMOSTRAS` no `PainelKPIs.jsx`.

## App Android

Localmente (com o Android Studio instalado):

```bash
npm run build
npx cap sync android
npx cap open android      # abre o projeto no Android Studio
```

Pelo GitHub Actions: cada `push` na branch `main` roda o workflow **Gerar APK Android** (`.github/workflows/build-apk.yml`), que gera um APK de debug. Para funcionar, cadastre dois *secrets* em **Settings → Secrets and variables → Actions**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

O APK fica na aba **Actions**, dentro da execução, como artefato **VagaLink-APK**. Para instalar no celular, permita a instalação de apps de fontes desconhecidas.

## Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `'vite' não é reconhecido` | faltam as dependências: rode `npm install` |
| Página em branco e `supabaseUrl is required` no console (F12) | falta o `.env` ou os nomes das variáveis estão diferentes: confira `.env.example` e reinicie o `npm run dev` |
| Mapa sempre verde, sem ler os sensores | falta a política de leitura para `authenticated`: rode `supabase/kpis.sql` |
| Painel mostra "função kpi_ocupacao_semana não existe" | rode `supabase/kpis.sql` no SQL Editor |
| Painel mostra "Coletando dados" | ainda não há histórico válido: confira se o ESP32 está enviando e se o job `historico-1min` existe |
| `Port 5173 is in use` | já há outro servidor aberto; o Vite usa a próxima porta, ou feche o antigo |
| Nenhuma porta COM nova ao ligar o ESP32 | cabo só de carga ou falta o driver CP210x / CH340 |
| `SEM LEITURA` / `-1.0` em todos os sensores | confira VCC no VIN (5 V), GND comum, resistores do ECHO e os pinos TRIG/ECHO |
| ESP32 imprime `Envio: 401` ou `403` | chave errada ou política de RLS faltando |
| ESP32 imprime `Envio: 404` | a tabela `sensores` não existe ou a `URL` está errada |
| `git push` rejeitado (fetch first) | rode `git pull` e depois `git push` (nunca `--force`) |

## Limitações e próximos passos

- Só 4 das 268 vagas têm sensor. Os KPIs descrevem essas vagas, não o estacionamento inteiro.
- Qualquer pessoa com a chave publishable consegue gravar em `sensores` (política `to anon`). Serve para protótipo. Para produção, restrinja a escrita (por exemplo, com uma Edge Function ou um usuário dedicado para o dispositivo).
- O firmware usa `client.setInsecure()` (não valida o certificado). Em produção, valide o certificado do servidor.
- O mapeamento sensor → vaga é manual, no código.
- O APK gerado é de debug.
