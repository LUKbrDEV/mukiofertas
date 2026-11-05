-- MukiOfertas: Relâmpago de verdade + tag Super desconto
-- Cole TUDO no Supabase → SQL Editor → Run. Pode rodar mais de uma vez.
--
-- Antes: "Relâmpago" = preço acima de R$ X e desconto de Y% (regra do painel).
-- Agora:
--   ⚡ Relâmpago     = oferta com HORA PARA ACABAR (coluna relampago_ate). Vem das postagens do
--                      Telegram que dizem "relâmpago" e da marcação no painel. Some sozinha quando a hora passa.
--   🔥 Super desconto = a regra antiga do painel (preço acima de R$ X e Y% de desconto).

alter table public.ofertas add column if not exists super_desconto boolean not null default false;
alter table public.ofertas add column if not exists relampago_ate timestamptz;
create index if not exists ofertas_relampago_ate_idx on public.ofertas (relampago_ate) where relampago_ate is not null;

-- Roda depois dos outros gatilhos da tabela (o nome começa com "zz", e o Postgres roda em ordem alfabética),
-- então ele tem a palavra final sobre relampago e super_desconto.
create or replace function public.ofertas_relampago_real()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  cfg jsonb;
  preco_min numeric;
  desconto_min numeric;
  desconto numeric := 0;
begin
  select dados into cfg from config_site where id = 1;
  preco_min := coalesce((cfg->>'relampago_preco_minimo')::numeric, 500);
  desconto_min := coalesce((cfg->>'relampago_desconto_minimo')::numeric, 40);

  if new.preco_antigo is not null and new.preco_antigo > 0 and new.preco_antigo > new.preco_atual then
    desconto := round((new.preco_antigo - new.preco_atual) / new.preco_antigo * 100);
  end if;

  new.super_desconto := coalesce(new.preco_atual, 0) > preco_min and desconto >= desconto_min;
  new.relampago := coalesce(new.relampago_ate > now(), false);
  return new;
end $$;

drop trigger if exists zz_ofertas_relampago_real on public.ofertas;
create trigger zz_ofertas_relampago_real
  before insert or update on public.ofertas
  for each row execute function public.ofertas_relampago_real();

-- Aplica nas ofertas que já estão no banco (as que eram "relâmpago" pela regra antiga viram Super desconto).
-- Só mexe nas linhas que mudam, para não "renovar" a data de atualização de todas as ofertas.
with calc as (
  select o.id,
         coalesce(o.preco_atual, 0) > coalesce((c.dados->>'relampago_preco_minimo')::numeric, 500)
         and (case when o.preco_antigo > 0 and o.preco_antigo > o.preco_atual
                   then round((o.preco_antigo - o.preco_atual) / o.preco_antigo * 100) else 0 end)
             >= coalesce((c.dados->>'relampago_desconto_minimo')::numeric, 40) as sd
  from public.ofertas o
  left join public.config_site c on c.id = 1
)
update public.ofertas o
set super_desconto = calc.sd
from calc
where calc.id = o.id
  and (o.super_desconto is distinct from calc.sd or (o.relampago and o.relampago_ate is null));
