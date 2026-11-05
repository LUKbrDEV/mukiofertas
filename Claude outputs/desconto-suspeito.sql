-- Colunas da trava de desconto. Rode uma vez no Supabase (SQL Editor → New query → Run).

-- guarda o preço antigo original quando ele foi considerado inventado
alter table ofertas add column if not exists preco_antigo_bruto numeric;

-- motivo pelo qual o desconto foi travado
alter table ofertas add column if not exists desconto_suspeito text;

-- Para DESFAZER a trava de uma oferta específica (troque 123 pelo id):
-- update ofertas
--   set preco_antigo = preco_antigo_bruto, preco_antigo_bruto = null, desconto_suspeito = null
--   where id = 123;
