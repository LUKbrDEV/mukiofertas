-- =====================================================================================
-- SUPER DESCONTO v2: a tag só aparece em oferta realmente boa.
-- Rode UMA vez no Supabase: SQL Editor → New query → cole tudo → Run.
--
-- A oferta ganha a tag se passar em TODAS as regras:
--   1) desconto entre o mínimo (painel, padrão 40%) e o máximo (70%; Shopee/AliExpress 60%),
--      e sem a marca de "desconto suspeito" da trava de desconto
--   2) economia de pelo menos R$ 150 (painel)
--   3) com 7+ dias de histórico de preço: é o menor preço dos últimos 30 dias
--   4) Shopee/AliExpress só com nota do produto 4,7 ou mais (painel)
--   5) no máximo 10% das ofertas no ar têm a tag, as de maior economia (painel)
-- As regras 1 a 4 valem na hora em que a oferta entra ou muda de preço (gatilho).
-- A regra 5 é aplicada pela função recalcular_super_desconto(), que o robô chama a cada
-- execução e o botão "Aplicar às ofertas atuais" do painel também chama.
-- =====================================================================================

-- 0) A coluna super_desconto precisa ser uma coluna comum (se era calculada, vira comum)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ofertas' and column_name = 'super_desconto'
      and is_generated = 'ALWAYS'
  ) then
    alter table public.ofertas drop column super_desconto;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ofertas' and column_name = 'super_desconto'
  ) then
    alter table public.ofertas add column super_desconto boolean not null default false;
  end if;
end $$;

-- 1) A regra para UMA oferta (regras 1 a 4)
create or replace function public.oferta_merece_super_desconto(o public.ofertas, cfg jsonb)
returns boolean
language plpgsql
stable
set search_path to 'public'
as $$
declare
  linha jsonb := to_jsonb(o);           -- lê colunas opcionais sem quebrar se não existirem
  atual numeric := o.preco_atual;
  antigo numeric := o.preco_antigo;
  desconto numeric;
  marketplace boolean;
  maximo numeric;
  nota numeric;
  menor30 numeric;
begin
  if coalesce(o.categoria, '') = 'cupons' then return false; end if;
  if not (atual > 0 and antigo > atual) then return false; end if;
  if nullif(linha->>'desconto_suspeito', '') is not null then return false; end if;

  desconto := (antigo - atual) / antigo * 100;
  marketplace := lower(coalesce(o.loja, '')) ~ '(shopee|aliexpress)';
  maximo := case when marketplace
                 then coalesce((cfg->>'super_desconto_maximo_marketplace')::numeric, 60)
                 else coalesce((cfg->>'super_desconto_maximo')::numeric, 70) end;

  -- regra 1: desconto real (nem pouco, nem exagerado)
  if desconto < coalesce((cfg->>'relampago_desconto_minimo')::numeric, 40) or desconto > maximo then
    return false;
  end if;

  -- regra 2: economia em reais
  if antigo - atual < coalesce((cfg->>'super_economia_minima')::numeric, 150) then return false; end if;

  -- regra 4: marketplace só com nota alta
  if marketplace then
    nota := nullif(linha->>'nota', '')::numeric;
    if nota is null or nota < coalesce((cfg->>'super_nota_marketplace')::numeric, 4.7) then return false; end if;
  end if;

  -- regra 3: menor preço dos últimos 30 dias (só quando já tem 7+ dias de histórico)
  if o.id is not null then
    begin
      if exists (
        select 1 from historico_ofertas h
        where h.oferta_id = o.id and h.registrado_em <= now() - interval '7 days'
      ) then
        select min(h.preco) into menor30 from historico_ofertas h
        where h.oferta_id = o.id and h.registrado_em >= now() - interval '30 days';
        if menor30 is not null and atual > menor30 + 0.01 then return false; end if;
      end if;
    exception when undefined_table then
      null; -- sem tabela de histórico: pula a regra 3
    end;
  end if;

  return true;
end;
$$;

-- 2) Gatilho: calcula a tag quando a oferta entra ou quando muda preço/loja/nota.
--    O nome começa com "zz_" para rodar por ÚLTIMO (vale sobre qualquer regra antiga).
create or replace function public.zz_super_desconto_gatilho()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  cfg jsonb;
begin
  -- recálculo geral em andamento: ele já decidiu o valor
  if current_setting('muki.recalculando_super', true) = '1' then return new; end if;

  if tg_op = 'UPDATE'
     and new.preco_atual is not distinct from old.preco_atual
     and new.preco_antigo is not distinct from old.preco_antigo
     and new.loja is not distinct from old.loja
     and new.categoria is not distinct from old.categoria
     and (to_jsonb(new)->'nota') is not distinct from (to_jsonb(old)->'nota')
     and (to_jsonb(new)->'desconto_suspeito') is not distinct from (to_jsonb(old)->'desconto_suspeito') then
    new.super_desconto := old.super_desconto; -- nada que importa mudou: mantém
    return new;
  end if;

  select coalesce(dados, '{}'::jsonb) into cfg from config_site where id = 1;
  new.super_desconto := oferta_merece_super_desconto(new, coalesce(cfg, '{}'::jsonb));
  return new;
end;
$$;

drop trigger if exists zz_super_desconto on public.ofertas;
create trigger zz_super_desconto
  before insert or update on public.ofertas
  for each row execute function public.zz_super_desconto_gatilho();

-- 3) Recálculo geral (regras 1 a 4 + limite de 10% das ofertas no ar, ficando as de maior economia)
create or replace function public.recalcular_super_desconto()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  cfg jsonb;
  pct numeric;
  no_ar int;
  limite int;
  alteradas int;
begin
  -- pode rodar: administrador do painel, o robô (service_role) ou o SQL Editor
  if not (coalesce(auth.role(), '') in ('service_role', '') or eh_admin()) then
    raise exception 'Somente administradores';
  end if;

  select coalesce(dados, '{}'::jsonb) into cfg from config_site where id = 1;
  cfg := coalesce(cfg, '{}'::jsonb);
  pct := coalesce((cfg->>'super_percentual_maximo')::numeric, 10);

  select count(*) into no_ar from ofertas
  where ativa and (expires_at is null or expires_at > now()) and coalesce(categoria, '') <> 'cupons';
  limite := greatest(1, ceil(no_ar * pct / 100.0));

  perform set_config('muki.recalculando_super', '1', true);

  with candidatas as (
    select o.id, (o.preco_antigo - o.preco_atual) as economia
    from ofertas o
    where o.ativa and (o.expires_at is null or o.expires_at > now())
      and oferta_merece_super_desconto(o, cfg)
  ),
  escolhidas as (
    select id from candidatas order by economia desc limit limite
  )
  update ofertas o
  set super_desconto = (o.id in (select id from escolhidas))
  where o.super_desconto is distinct from (o.id in (select id from escolhidas));

  get diagnostics alteradas = row_count;
  perform set_config('muki.recalculando_super', '0', true);
  return alteradas;
end;
$$;

grant execute on function public.recalcular_super_desconto() to authenticated, service_role;

-- 4) Botão "Aplicar às ofertas atuais" do painel: Destaque como antes + Super desconto novo
create or replace function public.reaplicar_regras_destaque()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  cfg jsonb;
  alteradas int;
  super int;
begin
  if not eh_admin() then
    raise exception 'Somente administradores';
  end if;

  select coalesce(dados, '{}'::jsonb) into cfg from config_site where id = 1;

  with calc as (
    select id,
      case when preco_antigo > preco_atual and preco_atual > 0
           then (preco_antigo - preco_atual) / preco_antigo * 100 else 0 end as desconto
    from ofertas
  )
  update ofertas o
  set destaque = c.desconto >= coalesce((cfg->>'destaque_desconto_minimo')::numeric, 60)
  from calc c
  where o.id = c.id
    and o.destaque is distinct from (c.desconto >= coalesce((cfg->>'destaque_desconto_minimo')::numeric, 60));

  get diagnostics alteradas = row_count;
  super := recalcular_super_desconto();
  return alteradas + super;
end;
$$;

-- 5) Aplica já nas ofertas que estão no site e mostra quantas ficaram com a tag
select public.recalcular_super_desconto() as ofertas_alteradas;
select count(*) filter (where super_desconto) as com_super_desconto,
       count(*) as ofertas_no_ar
from public.ofertas
where ativa and (expires_at is null or expires_at > now());
