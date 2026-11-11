-- Verificação em 2 etapas (2FA) obrigatória para o painel admin do MukiOfertas.
-- Rode UMA vez no Supabase: SQL Editor → New query → cole tudo → Run.
--
-- O que faz:
--   1. Copia a sua função eh_admin() atual para eh_admin_sem_2fa()
--      (só confere se o e-mail está na lista de admins; o painel usa para saber se deve pedir o 2FA).
--   2. Troca a eh_admin() para exigir também o 2FA (login com nível "aal2").
--      Todas as regras do banco e rotas /api/admin que já usam eh_admin() passam a exigir o 2FA,
--      sem precisar mexer em cada uma.
--
-- O robô da VPS usa a chave service_role e NÃO é afetado.
-- Pode rodar de novo sem problema.

-- 1) Cópia da função atual (só na primeira vez)
do $$
declare
  definicao text;
begin
  if to_regprocedure('public.eh_admin_sem_2fa()') is null then
    definicao := pg_get_functiondef('public.eh_admin()'::regprocedure);
    definicao := replace(definicao, 'public.eh_admin()', 'public.eh_admin_sem_2fa()');
    execute definicao;
  end if;
end $$;

grant execute on function public.eh_admin_sem_2fa() to authenticated;

-- 2) eh_admin() agora exige: estar na lista de admins E ter passado pelo 2FA
create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.eh_admin_sem_2fa()
     and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

grant execute on function public.eh_admin() to authenticated;

-- Conferência: deve mostrar as duas funções
select proname from pg_proc where proname in ('eh_admin', 'eh_admin_sem_2fa');

-- ─────────────────────────────────────────────────────────────
-- Se um admin perder o celular:
--   Supabase → Authentication → Users → clique no usuário → apague o fator MFA.
--   No próximo login ele cadastra o 2FA de novo pelo QR Code.
-- ─────────────────────────────────────────────────────────────
