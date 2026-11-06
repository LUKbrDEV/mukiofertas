-- Fila de ofertas do Mercado Livre: o robô acha as ofertas e elas esperam aqui até
-- você gerar os links de afiliado no painel do ML e colar no painel admin.
-- Rode uma vez no Supabase (SQL Editor → New query → Run).

create table if not exists ml_fila (
  id bigserial primary key,
  produto_id text not null unique,     -- id do produto no Mercado Livre (MLB...)
  item_id text,                        -- anúncio que tem o melhor preço
  titulo text not null,
  categoria text,
  preco_atual numeric not null,
  preco_antigo numeric,
  desconto integer,
  imagem text,
  url text not null,                   -- página do produto (é esta que vai no gerador de links do ML)
  status text not null default 'pendente', -- pendente | publicada | descartada
  oferta_id bigint,                    -- oferta criada no site quando publicada
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists ml_fila_status_idx on ml_fila (status, desconto desc);

-- Só o robô e o painel (pela API, com a chave service_role) mexem nesta tabela
alter table ml_fila enable row level security;
