-- XP por like (MukiOfertas) — rode no Supabase: SQL Editor → New query → cole tudo → Run.
-- Pode rodar mais de uma vez sem problema.

-- 1) Tabela dos likes de quem está logado (1 linha por pessoa por produto)
create table if not exists public.likes_usuarios (
  user_id uuid not null references auth.users (id) on delete cascade,
  oferta_id bigint not null,
  criado_em timestamptz not null default now()
);
create unique index if not exists likes_usuarios_unico on public.likes_usuarios (user_id, oferta_id);
alter table public.likes_usuarios add column if not exists criado_em timestamptz not null default now();
alter table public.likes_usuarios enable row level security;

-- 2) Função que o site chama ao curtir: usa o login de quem clicou (auth.uid()),
--    então ninguém consegue dar XP para outra pessoa, e não depende das regras (RLS) da tabela.
create or replace function public.registrar_like_xp(p_oferta bigint, p_curtiu boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return 'sem_login';
  end if;
  if p_curtiu then
    insert into public.likes_usuarios (user_id, oferta_id) values (uid, p_oferta)
    on conflict (user_id, oferta_id) do nothing;
    return 'ok';
  else
    delete from public.likes_usuarios where user_id = uid and oferta_id = p_oferta;
    return 'removido';
  end if;
end;
$$;

revoke all on function public.registrar_like_xp(bigint, boolean) from public, anon;
grant execute on function public.registrar_like_xp(bigint, boolean) to authenticated;

-- 3) Conferência: últimos likes gravados (deve aparecer o like do seu amigo depois do teste)
select l.criado_em, u.email, l.oferta_id
from public.likes_usuarios l
join auth.users u on u.id = l.user_id
order by l.criado_em desc
limit 10;
