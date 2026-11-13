-- Botões "Rodar agora" do painel admin (Saúde do robô).
-- Rode UMA vez no Supabase: SQL Editor → New query → cole tudo → Run.
--
-- O painel grava um pedido aqui; a VPS (scripts/executar-pedidos.mjs, a cada minuto pelo cron)
-- pega o pedido, roda a tarefa e grava o resultado.

create table if not exists public.robo_pedidos (
  id            bigint generated always as identity primary key,
  tarefa        text not null,
  status        text not null default 'pendente'
                check (status in ('pendente', 'rodando', 'ok', 'erro', 'cancelado')),
  pedido_por    text,
  criado_em     timestamptz not null default now(),
  iniciado_em   timestamptz,
  terminado_em  timestamptz,
  saida         text
);

create index if not exists robo_pedidos_status_idx on public.robo_pedidos (status, criado_em);
create index if not exists robo_pedidos_criado_idx on public.robo_pedidos (criado_em desc);

-- Só administradores enxergam (quem grava é a rota do painel e a VPS, com a chave de serviço)
alter table public.robo_pedidos enable row level security;
drop policy if exists "admins leem pedidos do robo" on public.robo_pedidos;
create policy "admins leem pedidos do robo" on public.robo_pedidos
  for select to authenticated using (public.eh_admin());
