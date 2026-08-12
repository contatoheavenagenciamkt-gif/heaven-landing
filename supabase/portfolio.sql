-- =============================================================================
-- Heaven · Portfólio de projetos (gerenciado pelo /admin/portfolio)
-- =============================================================================
-- Rode no SQL Editor do Supabase do CRM (projeto mkhiykxsfbcbybxhqlkj), o MESMO
-- que o funil /forms/ e o tracking já usam. Pode rodar quantas vezes quiser —
-- é idempotente.
--
-- Regra de acesso, igual ao resto do site:
--   - anon (visitante) LÊ só os projetos publicados → a página /portfolio/ abre
--     pra qualquer um que receba o link, sem login;
--   - authenticated (você, logado no /admin) faz tudo: criar, editar, excluir.
-- =============================================================================

create table if not exists public.portfolio_projetos (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,          -- identificador curto; vai pro /admin nos cliques
  cliente       text not null,                 -- nome grande no card
  segmento      text,                          -- 'Moda praia · Paulista/PE'
  titulo        text,                          -- o que foi entregue
  resumo        text,                          -- 2 a 3 linhas
  entregas      text[] not null default '{}',  -- etiquetas do card
  url           text,                          -- demo no ar; vazio = "em preparação"
  cover         text,                          -- imagem de capa; null = capa gerada
  cor_1         text default '#1b2233',        -- cores da capa gerada
  cor_2         text default '#3b9eff',
  tipo          text default 'Projeto entregue',
  ano           text,
  publicado     boolean not null default true, -- desmarcado = some da página pública
  ordem         integer not null default 0,    -- menor aparece primeiro
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists portfolio_projetos_ordem_idx
  on public.portfolio_projetos (publicado, ordem, criado_em desc);

-- atualizado_em se mantém sozinho
create or replace function public.portfolio_touch()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

drop trigger if exists portfolio_projetos_touch on public.portfolio_projetos;
create trigger portfolio_projetos_touch
  before update on public.portfolio_projetos
  for each row execute function public.portfolio_touch();

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.portfolio_projetos enable row level security;

-- Visitante lê SÓ o que está publicado.
drop policy if exists portfolio_leitura_publica on public.portfolio_projetos;
create policy portfolio_leitura_publica on public.portfolio_projetos
  for select to anon
  using (publicado);

-- Logado lê tudo (inclusive rascunho) e escreve.
drop policy if exists portfolio_leitura_admin on public.portfolio_projetos;
create policy portfolio_leitura_admin on public.portfolio_projetos
  for select to authenticated
  using (true);

drop policy if exists portfolio_insert_admin on public.portfolio_projetos;
create policy portfolio_insert_admin on public.portfolio_projetos
  for insert to authenticated
  with check (true);

drop policy if exists portfolio_update_admin on public.portfolio_projetos;
create policy portfolio_update_admin on public.portfolio_projetos
  for update to authenticated
  using (true) with check (true);

drop policy if exists portfolio_delete_admin on public.portfolio_projetos;
create policy portfolio_delete_admin on public.portfolio_projetos
  for delete to authenticated
  using (true);

grant select on public.portfolio_projetos to anon;
grant select, insert, update, delete on public.portfolio_projetos to authenticated;

-- =============================================================================
-- Primeiro projeto (a demo Marévia). Rode junto ou pule — dá pra cadastrar
-- pelo /admin/portfolio. Deixe `url` vazio até subir na Vercel: o card mostra
-- "Em preparação" sozinho, sem prometer o que ainda não existe.
-- =============================================================================
insert into public.portfolio_projetos
  (slug, cliente, segmento, titulo, resumo, entregas, url, cor_1, cor_2, tipo, ano, ordem)
values (
  'marevia',
  'Marévia',
  'Moda praia e fitness · Paulista/PE',
  'Uma IA vendendo no WhatsApp — e o painel que mostra qual anúncio virou venda',
  'Operação de mil conversas por dia no WhatsApp, R$ 98 mil por mês em anúncio e nenhuma forma de saber qual criativo gerou qual venda. O sistema fecha esse buraco: o agente atende, consulta estoque e gera o Pix; a venda volta carimbada no anúncio de origem.',
  array['Atendimento com IA', 'Atribuição de anúncio', 'Admin e estoque', 'Loja com checkout'],
  '',
  '#0B3B3C',
  '#D1416A',
  'Protótipo de demonstração',
  '2026',
  0
)
on conflict (slug) do nothing;

-- =============================================================================
-- Conferir:
--   select slug, cliente, publicado, url from public.portfolio_projetos order by ordem;
-- =============================================================================
