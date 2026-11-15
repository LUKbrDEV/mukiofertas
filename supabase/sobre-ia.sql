-- "Sobre o produto" escrito pela IA: marca as ofertas cujo resumo foi gerado automaticamente
-- (a página mostra o aviso "Resumo gerado automaticamente. Confira os detalhes na página da loja.")
-- Rode uma vez no Supabase: SQL Editor → New query → cole → Run
alter table public.ofertas add column if not exists sobre_ia boolean not null default false;
