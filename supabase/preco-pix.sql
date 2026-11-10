-- Preço no PIX: valor mais baixo pagando no PIX (o preco_atual continua sendo o preço do cartão)
-- Rode uma vez no Supabase: SQL Editor → New query → cole → Run
alter table public.ofertas add column if not exists preco_pix numeric;
