-- Compra em grupo (grupo de 3 do AliExpress): mural de grupos abertos.
-- Rode UMA vez no Supabase: SQL Editor → New query → cole tudo → Run.
--
-- grupos_produtos: um produto do AliExpress (o id é o código do produto no AliExpress)
-- grupos_compra:   cada grupo divulgado por alguém (link que o AliExpress dá ao criar o grupo)
-- Quem grava é a rota do site (app/api/compra-em-grupo), com a chave de serviço.
-- Os visitantes só leem.

create table if not exists public.grupos_produtos (
  id              text primary key,                 -- código do produto no AliExpress
  titulo          text not null,
  imagem          text,
  categoria       text,
  preco_normal    numeric,                          -- preço comprando sozinho (da API do AliExpress)
  preco_grupo     numeric,                          -- preço no grupo (informado por quem divulgou)
  link_afiliado   text,                             -- botão "Criar meu grupo" (comissão garantida)
  grupos_criados  integer not null default 0,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

create table if not exists public.grupos_compra (
  id           bigint generated always as identity primary key,
  produto_id   text not null references public.grupos_produtos (id) on delete cascade,
  link         text not null unique,                -- link do grupo (a.aliexpress.com/...)
  faltam       integer not null default 2 check (faltam between 0 and 2),
  status       text not null default 'aberto' check (status in ('aberto', 'fechado', 'removido')),
  avisos_fechado integer not null default 0,        -- visitantes que avisaram "esse grupo já fechou"
  autor_id     uuid,
  autor_nome   text,
  criado_em    timestamptz not null default now(),
  expira_em    timestamptz not null default now() + interval '24 hours'  -- o AliExpress dá 24h
);

create index if not exists grupos_compra_abertos_idx on public.grupos_compra (produto_id, status, expira_em);
create index if not exists grupos_compra_criado_idx on public.grupos_compra (criado_em desc);
create index if not exists grupos_produtos_atualizado_idx on public.grupos_produtos (atualizado_em desc);

alter table public.grupos_produtos enable row level security;
alter table public.grupos_compra enable row level security;

drop policy if exists "todos leem produtos de grupo" on public.grupos_produtos;
create policy "todos leem produtos de grupo" on public.grupos_produtos
  for select to anon, authenticated using (true);

-- grupos removidos (pelo admin) não aparecem para ninguém
drop policy if exists "todos leem grupos" on public.grupos_compra;
create policy "todos leem grupos" on public.grupos_compra
  for select to anon, authenticated using (status <> 'removido');

-- ===== Parte 2 (pode rodar o arquivo inteiro de novo: nada é apagado) =====

-- Visualizações da página do produto (contadas pela rota do site)
alter table public.grupos_produtos add column if not exists visualizacoes integer not null default 0;

-- "Avisar sobre novos grupos": quem pediu recebe um e-mail quando alguém divulgar um grupo
-- deste produto (um aviso só; depois a pessoa pede de novo se quiser)
create table if not exists public.grupos_avisos (
  id          bigint generated always as identity primary key,
  produto_id  text not null references public.grupos_produtos (id) on delete cascade,
  user_id     uuid not null,
  email       text,
  criado_em   timestamptz not null default now(),
  unique (produto_id, user_id)
);
alter table public.grupos_avisos enable row level security;
-- cada pessoa vê só os próprios pedidos de aviso
drop policy if exists "cada um ve seus avisos de grupo" on public.grupos_avisos;
create policy "cada um ve seus avisos de grupo" on public.grupos_avisos
  for select to authenticated using (auth.uid() = user_id);

-- ===== Parte 3: de onde veio cada produto (lista "Para abrir grupo") =====
-- telegram = postagem de "grupo de 3" lida pelo robô · comunidade = alguém divulgou · admin = você adicionou
alter table public.grupos_produtos add column if not exists origem text not null default 'comunidade';

-- ===== Parte 4: envio para o grupo do WhatsApp =====
-- quando o grupo foi mandado para o WhatsApp (cada grupo vai uma vez só)
alter table public.grupos_compra add column if not exists postada_whatsapp_em timestamptz;
-- extra "abra um grupo": quando o produto foi mandado como sugestão para abrir grupo
alter table public.grupos_produtos add column if not exists abrir_whatsapp_em timestamptz;
