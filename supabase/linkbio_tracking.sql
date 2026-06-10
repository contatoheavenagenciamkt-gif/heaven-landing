-- =============================================================================
-- Heaven · tracking de acessos do site (heavenagencia.com) + /linkbio
-- =============================================================================
-- Rode no SQL Editor do Supabase do CRM (projeto mkhiykxsfbcbybxhqlkj), o MESMO
-- que o funil /forms/ já usa. Pode rodar este arquivo inteiro quantas vezes
-- quiser — é idempotente (create if not exists / create or replace).
--
-- O site é estático: o navegador grava cada evento direto na tabela via
-- PostgREST com a chave ANON (pública). Por isso:
--   - INSERT é liberado para anon (só 'visit'/'click');
--   - SELECT da tabela CRUA não é liberado (eventos crus ficam privados);
--   - o /admin lê só as VIEWS de agregados (contagens; sem dado pessoal).
-- =============================================================================

create table if not exists public.linkbio_events (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('visit', 'click')),
  slug        text,            -- card clicado no /linkbio (null em 'visit')
  destination text,            -- destino do clique (informativo)
  path        text,            -- página de origem (ex.: '/', '/linkbio', '/forms')
  referer     text,            -- de onde veio (Google, Instagram, direto…)
  user_agent  text,
  occurred_at timestamptz not null default now()
);

create index if not exists linkbio_events_kind_time_idx on public.linkbio_events (kind, occurred_at);
create index if not exists linkbio_events_slug_time_idx on public.linkbio_events (slug, occurred_at);
create index if not exists linkbio_events_path_time_idx on public.linkbio_events (path, occurred_at);

alter table public.linkbio_events enable row level security;

drop policy if exists linkbio_events_public_insert on public.linkbio_events;
create policy linkbio_events_public_insert on public.linkbio_events
  for insert to anon, authenticated
  with check (kind in ('visit', 'click'));

grant insert on public.linkbio_events to anon, authenticated;

-- =============================================================================
-- VIEWS DE AGREGADOS (o /admin lê só estas — contagens, sem dado pessoal)
-- =============================================================================

-- 1) Diário por página/link/tipo. Base para qualquer recorte (dia, mês, período
--    personalizado, /linkbio vs site direto, cliques por card).
create or replace view public.linkbio_daily as
select
  occurred_at::date            as day,
  kind,
  coalesce(path, '(desconhecido)') as path,
  slug,
  count(*)::bigint             as total
from public.linkbio_events
group by 1, 2, 3, 4;

-- 2) Origem das VISITAS por dia (host do referer). Para SEO / Google Meu Negócio:
--    ver quanto vem do Google, Instagram, direto, etc. (sem expor a URL inteira).
create or replace view public.linkbio_sources_daily as
select
  occurred_at::date as day,
  case
    when referer is null or referer = '' then '(direto)'
    else lower(regexp_replace(referer, '^https?://([^/:]+).*$', '\1'))
  end               as source,
  count(*)::bigint  as total
from public.linkbio_events
where kind = 'visit'
group by 1, 2;

-- 3) Mensal simples (compatível com a 1ª versão; opcional).
create or replace view public.linkbio_monthly as
select date_trunc('month', occurred_at)::date as month, kind, slug, count(*)::bigint as total
from public.linkbio_events
group by 1, 2, 3;

grant select on public.linkbio_daily          to anon, authenticated;
grant select on public.linkbio_sources_daily  to anon, authenticated;
grant select on public.linkbio_monthly        to anon, authenticated;

-- =============================================================================
-- Conferir depois de gerar alguns acessos:
--   select * from public.linkbio_daily order by day desc;
--   select * from public.linkbio_sources_daily order by day desc, total desc;
-- =============================================================================
