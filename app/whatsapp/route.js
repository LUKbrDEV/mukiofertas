// mukiofertas.com.br/whatsapp → página de entrada no grupo do WhatsApp
// Salve como app/whatsapp/route.js
// O link do grupo fica em data/links-curtos.js · o visual fica em lib/pagina-whatsapp.mjs
// (mukiofertas.com.br/grupo continua indo direto para o grupo, sem passar pela página)

import { createClient } from "@supabase/supabase-js";
import { LINK_GRUPO_WHATSAPP } from "../../data/links-curtos";
import { montarPaginaWhatsapp } from "../../lib/pagina-whatsapp.mjs";

export const revalidate = 300; // a página é atualizada a cada 5 minutos

// Começo do dia de hoje no horário de Brasília (UTC-3)
function inicioDeHoje() {
  const agora = new Date(Date.now() - 3 * 3600000);
  return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), 3)).toISOString();
}

export async function GET() {
  let hoje = 0;
  let ultimas = [];
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const [contagem, lista] = await Promise.all([
      db.from("ofertas").select("id", { count: "exact", head: true }).gte("postada_whatsapp_em", inicioDeHoje()),
      db
        .from("ofertas")
        .select("titulo, loja, preco_atual, preco_antigo, imagem")
        .not("postada_whatsapp_em", "is", null)
        .order("postada_whatsapp_em", { ascending: false })
        .limit(4),
    ]);
    hoje = contagem.count ?? 0;
    ultimas = lista.data ?? [];
  } catch {
    // sem banco: a página aparece sem a lista de ofertas
  }

  const html = montarPaginaWhatsapp({
    link: LINK_GRUPO_WHATSAPP,
    siteUrl: process.env.SITE_URL || "https://www.mukiofertas.com.br",
    hoje,
    ultimas,
  });
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
