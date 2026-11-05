-- MukiOfertas: ofertas fixadas na página inicial (aba "Página inicial" do painel admin)
-- Cole no Supabase → SQL Editor → Run. Pode rodar mais de uma vez.
--   fixada_home  = a oferta aparece no topo da página inicial (Destaques e Escolhas do Muki)
--   fixada_ordem = a ordem entre as fixadas (1 = primeira)
alter table public.ofertas add column if not exists fixada_home boolean not null default false;
alter table public.ofertas add column if not exists fixada_ordem integer;
create index if not exists ofertas_fixada_home_idx on public.ofertas (fixada_ordem) where fixada_home;
