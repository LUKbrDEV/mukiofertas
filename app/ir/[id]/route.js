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
    .select("id, loja, link, affiliate_link")
    .eq("id", id)
    .maybeSingle();

  if (!oferta || !/^https?:\/\//i.test(oferta.link)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Mercado Livre: SÓ o link oficial de afiliado (meli.la, gerado pelo scripts/converter-links-ml.mjs e
  // guardado em affiliate_link). Sem ele, nunca manda para outro link do ML: leva para a página da oferta
  // no site (a oferta já deveria estar escondida pela trava do banco, supabase/ml-so-meli.sql).
  // Magalu: sempre leva para a SUA loja do Influenciador Magalu (mesmo que a oferta tenha o link normal).
  const oficialML = String(oferta.affiliate_link ?? "").trim();
  const ehML = /mercado\s*livre/i.test(oferta.loja ?? "") || /mercadoli(vre|bre)\.com|meli\.la/i.test(oferta.link);
  let destino;
  if (/^https:\/\/meli\.la\/[A-Za-z0-9]+$/.test(oficialML)) destino = oficialML;
  else if (/^https?:\/\/meli\.la\//i.test(oferta.link)) destino = oferta.link;
  else if (ehML) return NextResponse.redirect(new URL(`/oferta/${oferta.id}`, request.url), 307);
  else destino = converterLinkMagalu(oferta.link);

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
