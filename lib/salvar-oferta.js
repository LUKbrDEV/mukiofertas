import { createClient } from "@supabase/supabase-js";
import { parseOferta } from "./parse-oferta";

const DIAS_NO_SITE = 5;

export async function salvarOferta(texto, origem = "telegram") {
  const oferta = parseOferta(texto);
  if (!oferta) return { ok: true, motivo: "sem_titulo_ou_link" };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: existente, error: erroBusca } = await supabase
    .from("ofertas")
    .select("id")
    .eq("original_link", oferta.link)
    .maybeSingle();

  if (erroBusca) {
    console.error("Erro ao buscar oferta:", erroBusca);
    return { ok: false, motivo: "erro_busca", detalhe: erroBusca.message };
  }
  if (existente) return { ok: true, motivo: "duplicada" };

  const expira = new Date(Date.now() + DIAS_NO_SITE * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from("ofertas").insert({
    title: oferta.titulo,
    price: oferta.price,
    original_link: oferta.link,
    affiliate_link: oferta.link,
    coupon_code: oferta.cupom,
    store: oferta.loja,
    source: origem,
    raw_text: String(texto).slice(0, 2000),
    status: process.env.OFERTA_STATUS_PADRAO || "ativa",
    expires_at: expira.toISOString(),
  });

  if (error) {
    console.error("Erro ao salvar oferta:", error);
    return { ok: false, motivo: "erro_insert", detalhe: error.message };
  }
  return { ok: true, motivo: "salva" };
}