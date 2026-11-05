-- MukiOfertas: Lista de desejos (coração nos produtos)
-- Cole no Supabase → SQL Editor → Run. Pode rodar mais de uma vez.

create table if not exists public.desejos (
  user_id uuid not null references auth.users(id) on delete cascade,
  oferta_id bigint not null references public.ofertas(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (user_id, oferta_id)
);
create index if not exists desejos_user_idx on public.desejos (user_id, criado_em desc);

alter table public.desejos enable row level security;
drop policy if exists "ver os proprios desejos" on public.desejos;
create policy "ver os proprios desejos" on public.desejos for select using (auth.uid() = user_id);
drop policy if exists "salvar os proprios desejos" on public.desejos;
create policy "salvar os proprios desejos" on public.desejos for insert with check (auth.uid() = user_id);
drop policy if exists "tirar os proprios desejos" on public.desejos;
create policy "tirar os proprios desejos" on public.desejos for delete using (auth.uid() = user_id);
