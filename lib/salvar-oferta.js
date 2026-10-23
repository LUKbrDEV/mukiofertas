import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { parseOferta } from "./parse-oferta";

const DIAS_NO_SITE = 5;

export async function salvarOferta(texto, origem = "telegram") {
  const oferta = parseOferta(texto);
  if (!oferta) return { ok: true, motivo: "sem_titulo_ou_link" };
  if (oferta.precoAtual === null) return { ok: true, motivo: "sem_preco" };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const idExterno =
    "tg-" + createHash("sha1").update(oferta.link.toLowerCase()).digest("hex").slice(0, 16);

  // Evita duplicada (mesmo link ou mesmo id)
  const { data: existente, error: erroBusca } = await supabase
    .from("ofertas")
    .select("id")
    .or(`link.eq.${oferta.link},id_externo.eq.${idExterno}`)
    .limit(1);

  if (erroBusca) {
    console.error("Erro ao buscar oferta:", erroBusca);
    return { ok: false, motivo: "erro_busca", detalhe: erroBusca.message };
  }
  if (existente && existente.length > 0) return { ok: true, motivo: "duplicada" };

  const agora = new Date();
  const expira = new Date(agora.getTime() + DIAS_NO_SITE * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from("ofertas").insert({
    loja: oferta.loja,
    id_externo: idExterno,
    titulo: oferta.titulo,
    categoria: oferta.categoria,
    preco_atual: oferta.precoAtual,
    preco_antigo: oferta.precoAntigo,
    link: oferta.link,
    cupom: oferta.cupom,
    origem,
    ativa: true,
    publicada_em: agora.toISOString(),
    atualizado_em: agora.toISOString(),
    expires_at: expira.toISOString(),
    // já está no canal, então o script de postagem não deve postar de novo
    postada_telegram_em: agora.toISOString(),
  });

  if (error) {
    console.error("Erro ao salvar oferta:", error);
    return { ok: false, motivo: "erro_insert", detalhe: error.message };
  }
  return { ok: true, motivo: "salva" };
}