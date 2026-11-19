import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { converterLinkMagalu } from "../../../lib/afiliado-magalu.mjs";

// Registra o clique e leva o visitante para o link de afiliado da oferta.
//
// Para o número de cliques do painel ser de GENTE (e não de robô):
//  - acessos de robôs (prévia de link do WhatsApp/Telegram/Facebook, Google, varredores...) não contam
//  - pré-carregamento do navegador (prefetch) não conta
//  - a mesma pessoa clicando de novo na mesma oferta em 30 min conta 1 vez só (cookie)
// Em todos os casos o visitante é levado para a loja normalmente.
const ROBOS =
  /bot\b|bot\/|crawl|spider|slurp|facebookexternalhit|facebookcatalog|meta-externalagent|whatsapp\/|telegrambot|twitterbot|discordbot|skypeuripreview|slackbot|linkedinbot|pinterestbot|embedly|quora link preview|vkshare|bingpreview|google-?inspection|googleother|adsbot|mediapartners|apis-google|feedfetcher|lighthouse|pagespeed|headlesschrome|phantomjs|^curl|^wget|python|node-fetch|undici|axios|okhttp|go-http|^java\/|libwww|httpclient|scrapy|ahrefs|semrush|mj12|dotbot|petalbot|yandex|baidu|bytespider|gptbot|claudebot|ccbot|amazonbot|applebot/i;
const JANELA_SEGUNDOS = 30 * 60;

function ehRobo(request) {
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua.trim() || ROBOS.test(ua)) return true;
  const prefetch = `${request.headers.get("purpose") ?? ""} ${request.headers.get("sec-purpose") ?? ""} ${request.headers.get("x-purpose") ?? ""}`;
  if (/prefetch|prerender|preview/i.test(prefetch)) return true;
  if (request.headers.get("next-router-prefetch")) return true;
  return false;
}

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

  const cookieClique = `mk_ir_${oferta.id}`;
  const jaContou = Boolean(request.cookies.get(cookieClique));
  const contar = !jaContou && !ehRobo(request);
  if (contar) {
    try {
      await supabase.from("cliques").insert({ oferta_id: oferta.id, origem });
    } catch {
      // se o registro falhar, o visitante é levado à oferta do mesmo jeito
    }
  }

  // Mercado Livre: o link oficial do gerador de afiliados (meli.la) é o que o ML conta.
  // Ele fica em affiliate_link (scripts/converter-links-ml.mjs); sem ele, vai o link do produto.
  // Magalu: sempre leva para a SUA loja do Influenciador Magalu (mesmo que a oferta tenha o link normal).
  const oficialML = String(oferta.affiliate_link ?? "").trim();
  const destino = /^https:\/\/meli\.la\/[A-Za-z0-9]+$/.test(oficialML) ? oficialML : converterLinkMagalu(oferta.link);

  const resposta = NextResponse.redirect(destino, 307);
  // não guarda o redirecionamento em cache (senão o próximo clique nem passa por aqui)
  resposta.headers.set("Cache-Control", "no-store");
  if (contar) {
    resposta.cookies.set(cookieClique, "1", {
      maxAge: JANELA_SEGUNDOS,
      path: `/ir/${oferta.id}`,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });
  }
  return resposta;
}
