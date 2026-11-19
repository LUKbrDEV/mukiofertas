-- Mercado Livre no site SÓ com link oficial de afiliado (meli.la).
-- Rode UMA vez no Supabase: SQL Editor → New query → cole tudo → Run.
--
-- Trava no próprio banco: se uma oferta do Mercado Livre for criada ou alterada para ficar no ar
-- (ativa = true) sem ter o meli.la (nem no link, nem no affiliate_link), ela fica ESCONDIDA
-- (ativa = false) e marcada como "aguardando". O robô (scripts/converter-links-ml.mjs) gera o meli.la
-- no gerador oficial e só então libera a oferta. Vale para tudo: robô do ML, Telegram, comunidade, painel.
-- Exceção: páginas de CUPOM do ML (mercadolivre.com.br/cupons e links de campanha /sec/), que o gerador
-- não converte em meli.la. Elas continuam aparecendo com o link normal.

create or replace function public.ml_so_meli()
returns trigger
language plpgsql
as $$
begin
  if new.loja ilike 'mercado%livre'
     and coalesce(new.ativa, false)
     and coalesce(new.link, '') !~* '^https?://meli\.la/'
     and coalesce(new.affiliate_link, '') !~* '^https?://meli\.la/'
     and coalesce(new.link, '') !~* 'mercadoli(vre|bre)\.com(\.br)?/(cupons|sec/)' then
    new.ativa := false;
    if new.affiliate_link is null then
      new.affiliate_link := 'aguardando';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ml_so_meli on public.ofertas;
create trigger ml_so_meli
  before insert or update on public.ofertas
  for each row execute function public.ml_so_meli();
