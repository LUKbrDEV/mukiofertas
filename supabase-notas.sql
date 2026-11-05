-- MukiOfertas: nota e vendas dos produtos (faixa "Mais bem avaliadas" da página inicial)
-- Cole no Supabase → SQL Editor → Run. Pode rodar mais de uma vez.
-- A Shopee manda a nota em estrelas (0 a 5) e o AliExpress em % de avaliações positivas
-- (o robô converte: 96% = 4,8). As outras lojas não informam nota pela API.
alter table public.ofertas add column if not exists nota numeric(3,1);
alter table public.ofertas add column if not exists vendas integer;
