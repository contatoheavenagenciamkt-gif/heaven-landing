-- =============================================================================
-- Link-in-bio (heavenagencia.com/linkbio) · tracking de acessos
-- =============================================================================
-- Rode UMA vez no SQL Editor do Supabase do CRM (projeto mkhiykxsfbcbybxhqlkj),
-- o MESMO que o funil /forms/ já usa.
--
-- O site é estático: o navegador grava cada evento direto na tabela via
-- PostgREST usando a chave ANON (pública, sem segredo). Por isso:
--   - INSERT é liberado para anon (mas só 'visit'/'click') — é um contador público;
--   - SELECT da tabela crua NÃO é liberado (eventos ficam privados);
--   - o painel lê só a VIEW de agregados (contagens por mês, sem dado pessoal).
-- =============================================================================

create table if not exists public.linkbio_events (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('visit', 'click')),
  slug        text,            -- qual card foi clicado (null em 'visit')
  destination text,            -- destino do clique (informativo)
  path        text,            -- página de origem (ex.: '/linkbio')
  referer     text,
  user_agent  text,
  occurred_at timestamptz not null default now()
);

create index if not exists linkbio_events_kind_time_idx on public.linkbio_events (kind, occurred_at);
create index if not exists linkbio_events_slug_time_idx on public.linkbio_events (slug, occurred_at);

alter table public.linkbio_events enable row level security;

-- Gravação pública (só os dois tipos válidos). Sem policy de SELECT => ninguém
-- lê os eventos crus pela API anon.
drop policy if exists linkbio_events_public_insert on public.linkbio_events;
create policy linkbio_events_public_insert on public.linkbio_events
  for insert to anon, authenticated
  with check (kind in ('visit', 'click'));

grant insert on public.linkbio_events to anon, authenticated;

-- --- Agregado mensal (o que o painel lê) -------------------------------------
create or replace view public.linkbio_monthly as
select
  date_trunc('month', occurred_at)::date as month,
  kind,
  slug,
  count(*)::bigint as total
from public.linkbio_events
group by 1, 2, 3;

-- A view expõe SOMENTE contagens (sem dado pessoal). Liberada para leitura
-- pública para o painel /linkbio/stats funcionar num site estático.
grant select on public.linkbio_monthly to anon, authenticated;

-- =============================================================================
-- Conferir depois de cadastrar e testar alguns acessos:
--   select * from public.linkbio_monthly order by month desc, kind, slug;
-- =============================================================================
