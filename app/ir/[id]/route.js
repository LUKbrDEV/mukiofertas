import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { converterLinkMagalu } from "../../../lib/afiliado-magalu.mjs";

// Registra o clique e leva o visitante para o link de afiliado da oferta.
export async function GET(request, { params }) {
  const { id } = await params;
  const origem =
    new URL(request.url).searchParams.get("o") === "telegram" ? "telegram" : "site";

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, link, affiliate_link")
    .eq("id", id)
    .maybeSingle();

  if (!oferta || !/^https?:\/\//i.test(oferta.link)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    await supabase.from("cliques").insert({ oferta_id: oferta.id, origem });
  } catch {
    // se o registro falhar, o visitante é levado à oferta do mesmo jeito
  }

  // Mercado Livre: o link oficial do gerador de afiliados (meli.la) é o que o ML conta.
  // Ele fica em affiliate_link (scripts/converter-links-ml.mjs); sem ele, vai o link do produto.
  if (/^https:\/\/meli\.la\/[A-Za-z0-9]+$/.test(String(oferta.affiliate_link ?? "").trim())) {
    return NextResponse.redirect(oferta.affiliate_link.trim(), 307);
  }

  // Magalu: sempre leva para a SUA loja do Influenciador Magalu (mesmo que a oferta tenha o link normal)
  return NextResponse.redirect(converterLinkMagalu(oferta.link), 307);
}
