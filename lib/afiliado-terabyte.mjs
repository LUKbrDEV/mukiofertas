// Converte links da Terabyte (terabyteshop.com.br) para o SEU link de parceiro (Programa de Parceiros Terabyte).
// Salve como lib/afiliado-terabyte.mjs
//
//   https://www.terabyteshop.com.br/produto/20782/processador-amd-ryzen-5-5500...
//   vira
//   https://www.terabyteshop.com.br/produto/20782/processador-amd-ryzen-5-5500...?p=1713204&pl=113219
//
// p  = o seu código de parceiro (é ele que diz que a venda é sua)
// pl = número do link gerado no painel (muda a cada link gerado). O robô usa sempre o mesmo.
// Link de OUTRO parceiro (com outro ?p=) também é trocado pelo seu.
// Dá para trocar os números sem mexer no código: TERABYTE_PARCEIRO e TERABYTE_LINK no .env.local / .env.robo

export const TERABYTE_PARCEIRO = process.env.TERABYTE_PARCEIRO || "1713204";
export const TERABYTE_LINK = process.env.TERABYTE_LINK || "113219";

export const ehLinkTerabyte = (link) => /terabyteshop\.com\.br/i.test(String(link || ""));

export function converterLinkTerabyte(link) {
  let url;
  try {
    url = new URL(String(link || "").trim());
  } catch {
    return link;
  }
  if (!/(^|\.)terabyteshop\.com\.br$/i.test(url.hostname)) return link;
  // tira o rastreio antigo (de outro parceiro ou de campanha) e coloca o seu
  for (const k of ["p", "pl", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) url.searchParams.delete(k);
  url.searchParams.set("p", TERABYTE_PARCEIRO);
  url.searchParams.set("pl", TERABYTE_LINK);
  url.hash = "";
  url.hostname = "www.terabyteshop.com.br";
  url.protocol = "https:";
  return url.toString();
}
