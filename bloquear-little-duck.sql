-- Tira do site as ofertas da Little Duck que já estão no banco.
-- Rode uma vez no Supabase (SQL Editor → New query → Run).
-- A oferta fica escondida (ativa = false); dá para ver no painel admin e apagar de vez se quiser.
update ofertas
set ativa = false
where loja ilike '%little duck%'
   or titulo ilike '%little duck%';
