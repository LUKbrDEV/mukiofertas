-- MukiOfertas: comunidade, histórico de preço e alertas
-- Cole TUDO no Supabase → SQL Editor → Run. Pode rodar mais de uma vez sem problema.
-- Precisa já existir: tabela sugestoes (com user_id, status, oferta_id, aprovada_em),
-- função ranking_xp_por_oferta() e tabela usuario_tags (do ranking.sql).


-- ============================================================
-- 1) AVISO "SUA OFERTA FOI APROVADA"
-- Devolve as sugestões da própria pessoa (quem está logado) aprovadas depois de p_desde.
-- ============================================================
create or replace function public.minhas_aprovacoes(p_desde timestamptz)
returns table(id bigint, titulo text, oferta_id bigint, aprovada_em timestamptz, xp integer)
language sql stable security definer
set search_path to 'public'
as $$
  select s.id::bigint, s.titulo::text, s.oferta_id::bigint, s.aprovada_em, ranking_xp_por_oferta()
  from sugestoes s
  where s.user_id = auth.uid()
    and s.status = 'aprovada'
    and s.aprovada_em > coalesce(p_desde, now() - interval '7 days')
  order by s.aprovada_em desc
  limit 10;
$$;
revoke all on function public.minhas_aprovacoes(timestamptz) from public, anon;
grant execute on function public.minhas_aprovacoes(timestamptz) to authenticated;


-- ============================================================
-- 2) PERFIL PÚBLICO DO MEMBRO (/membro/nome)
-- Mostra só nome, avatar, tags, XP e as ofertas aprovadas. Nunca mostra e-mail.
-- ============================================================
create or replace function public.perfil_publico(p_nome text)
returns json
language sql stable security definer
set search_path to 'public', 'auth'
as $$
  with membro as (
    select u.id, u.created_at, u.raw_user_meta_data as meta
    from auth.users u
    where lower(trim(u.raw_user_meta_data->>'nome')) = lower(trim(p_nome))
       or (coalesce(trim(u.raw_user_meta_data->>'nome'), '') = ''
           and lower(trim(u.raw_user_meta_data->>'full_name')) = lower(trim(p_nome)))
    order by (lower(trim(u.raw_user_meta_data->>'nome')) = lower(trim(p_nome))) desc nulls last, u.created_at
    limit 1
  ),
  aprovadas as (
    select s.oferta_id, s.aprovada_em
    from sugestoes s
    join membro m on m.id = s.user_id
    where s.status = 'aprovada' and s.oferta_id is not null
  ),
  mes as (
    select count(*)::int as qtd from aprovadas
    where aprovada_em >= date_trunc('month', now())
  )
  select case when not exists (select 1 from membro) then null else json_build_object(
    'nome', (select coalesce(nullif(trim(meta->>'nome'), ''), meta->>'full_name') from membro),
    'avatar_url', (select meta->>'avatar_url' from membro),
    'avatar_icone', (select meta->>'avatar_icone' from membro),
    'avatar_cor', (select meta->>'avatar_cor' from membro),
    'membro_desde', (select created_at from membro),
    'tags', coalesce((select t.tags from usuario_tags t join membro m on m.id = t.user_id), '{}'),
    'ofertas', (select count(*)::int from aprovadas),
    'xp', (select count(*)::int from aprovadas) * ranking_xp_por_oferta(),
    'xp_mes', (select qtd from mes) * ranking_xp_por_oferta(),
    'ofertas_ids', coalesce((select json_agg(oferta_id order by aprovada_em desc) from (
      select oferta_id, aprovada_em from aprovadas order by aprovada_em desc limit 40) x), '[]'::json)
  ) end;
$$;
grant execute on function public.perfil_publico(text) to anon, authenticated;


-- ============================================================
-- 3) HISTÓRICO DE PREÇO (gráfico na página do produto)
-- Toda vez que uma oferta entra ou muda de preço, guarda uma linha aqui (gatilho no banco,
-- então vale para TODAS as fontes: robô, Telegram, painel e comunidade).
-- ============================================================
create table if not exists public.historico_ofertas (
  id bigint generated always as identity primary key,
  oferta_id bigint not null references public.ofertas(id) on delete cascade,
  preco numeric(12,2) not null,
  registrado_em timestamptz not null default now()
);
create index if not exists historico_ofertas_oferta_idx on public.historico_ofertas (oferta_id, registrado_em);

alter table public.historico_ofertas enable row level security;
drop policy if exists "historico de preco e publico" on public.historico_ofertas;
create policy "historico de preco e publico" on public.historico_ofertas for select using (true);

create or replace function public.gravar_historico_preco()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.preco_atual is null or new.preco_atual <= 0 then return new; end if;
  if tg_op = 'INSERT' or new.preco_atual is distinct from old.preco_atual then
    -- no máximo uma linha por oferta por hora (o robô pode atualizar várias vezes seguidas)
    delete from historico_ofertas
      where oferta_id = new.id and registrado_em > now() - interval '1 hour';
    insert into historico_ofertas (oferta_id, preco) values (new.id, new.preco_atual);
  end if;
  return new;
end $$;

drop trigger if exists ofertas_historico_preco on public.ofertas;
create trigger ofertas_historico_preco
  after insert or update of preco_atual on public.ofertas
  for each row execute function public.gravar_historico_preco();

-- Começa o histórico com o preço de hoje de todas as ofertas que ainda não têm nenhum registro
insert into historico_ofertas (oferta_id, preco, registrado_em)
select o.id, o.preco_atual, coalesce(o.publicada_em, now())
from ofertas o
where o.preco_atual > 0
  and not exists (select 1 from historico_ofertas h where h.oferta_id = o.id);


-- ============================================================
-- 4) ALERTAS DE PREÇO ("me avise quando aparecer air fryer até R$ 300")
-- ============================================================
create table if not exists public.alertas (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  termo text not null check (char_length(trim(termo)) between 2 and 60),
  preco_max numeric(12,2),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  ultimo_aviso_em timestamptz
);
create index if not exists alertas_ativos_idx on public.alertas (ativo);

alter table public.alertas enable row level security;
drop policy if exists "ver os proprios alertas" on public.alertas;
create policy "ver os proprios alertas" on public.alertas for select using (auth.uid() = user_id);
drop policy if exists "criar os proprios alertas" on public.alertas;
create policy "criar os proprios alertas" on public.alertas for insert with check (auth.uid() = user_id);
drop policy if exists "mudar os proprios alertas" on public.alertas;
create policy "mudar os proprios alertas" on public.alertas for update using (auth.uid() = user_id);
drop policy if exists "apagar os proprios alertas" on public.alertas;
create policy "apagar os proprios alertas" on public.alertas for delete using (auth.uid() = user_id);

-- Avisos gerados pelo robô (scripts/avisar-alertas.mjs); a pessoa vê no sininho do site
create table if not exists public.avisos_alerta (
  id bigint generated always as identity primary key,
  alerta_id bigint not null references public.alertas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  oferta_id bigint not null references public.ofertas(id) on delete cascade,
  criado_em timestamptz not null default now(),
  lido boolean not null default false,
  unique (alerta_id, oferta_id)
);
create index if not exists avisos_alerta_user_idx on public.avisos_alerta (user_id, lido, criado_em desc);

alter table public.avisos_alerta enable row level security;
drop policy if exists "ver os proprios avisos" on public.avisos_alerta;
create policy "ver os proprios avisos" on public.avisos_alerta for select using (auth.uid() = user_id);
drop policy if exists "marcar os proprios avisos" on public.avisos_alerta;
create policy "marcar os proprios avisos" on public.avisos_alerta for update using (auth.uid() = user_id);

-- Cada pessoa pode ter no máximo 20 alertas
create or replace function public.limite_alertas()
returns trigger language plpgsql as $$
begin
  if (select count(*) from alertas where user_id = new.user_id) >= 20 then
    raise exception 'Você já tem 20 alertas. Apague algum para criar outro.';
  end if;
  return new;
end $$;
drop trigger if exists alertas_limite on public.alertas;
create trigger alertas_limite before insert on public.alertas
  for each row execute function public.limite_alertas();
