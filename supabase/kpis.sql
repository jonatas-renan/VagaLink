-- VagaLink · KPIs do painel /admin
-- Rode este arquivo inteiro no SQL Editor do Supabase (Run).

-- 1) Usuários LOGADOS usam o papel "authenticated", não "anon".
--    As políticas de leitura precisam valer para os dois.
drop policy if exists "app le" on sensores;
create policy "app le" on sensores
  for select to anon, authenticated using (true);

drop policy if exists "app le historico" on historico;
create policy "app le historico" on historico
  for select to anon, authenticated using (true);

-- 2) Índice para consultas por período
create index if not exists historico_tempo_idx
  on historico (registrado_em desc);

-- 3) Agregação por dia/hora/sensor (fuso de São Paulo).
--    Devolve no máximo ~800 linhas, abaixo do limite de 1000 da API,
--    em vez de baixar as ~40 mil linhas brutas da semana.
create or replace function kpi_ocupacao_semana(
  p_dias int default 8,
  p_limite_cm real default 150
)
returns table (
  dia date,
  hora int,
  sensor_id int,
  leituras int,
  validas int,
  ocupadas int
)
language sql
stable
as $$
  select
    (h.registrado_em at time zone 'America/Sao_Paulo')::date,
    extract(hour from h.registrado_em at time zone 'America/Sao_Paulo')::int,
    h.sensor_id,
    count(*)::int,
    (count(*) filter (where h.distancia_cm is not null and h.distancia_cm > 0))::int,
    (count(*) filter (where h.distancia_cm > 0 and h.distancia_cm < p_limite_cm))::int
  from historico h
  where h.registrado_em >= now() - make_interval(days => p_dias)
  group by 1, 2, 3
  order by 1, 2, 3;
$$;
