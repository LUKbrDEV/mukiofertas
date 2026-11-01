-- Envio das ofertas para o grupo do WhatsApp.
-- Cole no Supabase → SQL Editor → Run.

-- Quando a oferta foi enviada para o grupo (null = ainda não foi)
alter table ofertas add column if not exists postada_whatsapp_em timestamptz;
create index if not exists ofertas_postada_whatsapp_idx on ofertas (postada_whatsapp_em);

-- As ofertas que já estão no site NÃO são enviadas (só as que entrarem daqui para frente)
update ofertas set postada_whatsapp_em = now() where postada_whatsapp_em is null;
