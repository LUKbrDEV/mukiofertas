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
    .select("id, link")
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

  // Magalu: sempre leva para a SUA loja do Influenciador Magalu (mesmo que a oferta tenha o link normal)
  return NextResponse.redirect(converterLinkMagalu(oferta.link), 307);
}
