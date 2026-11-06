// Converte links da Netshoes (e de outras lojas da Rakuten) para o SEU link de afiliado da Rakuten.
// Salve como lib/afiliado-rakuten.mjs. Usado pelo lib/salvar-oferta.js (ofertas que chegam pelo Telegram).
//
//   https://www.netshoes.com.br/AHK-00NZ-012?utm_source=...
//   vira
//   https://click.linksynergy.com/deeplink?id=SEU_ID&mid=43984&murl=https%3A%2F%2Fwww.netshoes.com.br%2FAHK-00NZ-012
//
// Também troca o link de afiliado de OUTRA pessoa (click.linksynergy.com/...murl=...) pelo seu,
// e abre links encurtados (bit.ly etc.) só até descobrir o endereço da loja (sem abrir a página da loja).

// O seu id de publisher na Rakuten (aparece como "id=" nos links da API). Dá para trocar no .env.
export const RAKUTEN_ID = (process.env.RAKUTEN_PUBLISHER_ID || "iKxba6UpKws").trim();

// Lojas da Rakuten: nome no site, MID e endereço da loja
const LOJAS = [{ loja: "Netshoes", mid: "43984", host: /(^|\.)netshoes\.com\.br$/i }];

const MAX_REDIRECIONAMENTOS = 6;

const lojaDoHost = (host) => LOJAS.find((l) => l.host.test(host)) ?? null;

// Endereço limpo do produto na loja (sem parâmetros de rastreio de outras pessoas)
function paginaLimpa(url) {
  const u = new URL(url);
  return `https://${u.hostname.toLowerCase()}${u.pathname}`.replace(/\/+$/, "");
}

const deepLink = (cfg, pagina) =>
  `https://click.linksynergy.com/deeplink?id=${encodeURIComponent(RAKUTEN_ID)}&mid=${cfg.mid}&murl=${encodeURIComponent(pagina)}`;

// Segue os redirecionamentos (sem abrir a página final) até chegar no endereço de uma loja da Rakuten
async function descobrirDestino(link) {
  let atual = link;
  for (let i = 0; i < MAX_REDIRECIONAMENTOS; i++) {
    let u;
    try {
      u = new URL(atual);
    } catch {
      return null;
    }
    if (lojaDoHost(u.hostname)) return atual;
    const murl = u.searchParams.get("murl") || u.searchParams.get("url") || u.searchParams.get("ued");
    if (murl && /^https?:\/\//i.test(murl)) {
      atual = murl;
      continue;
    }
    try {
      const r = await fetch(atual, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(8000) });
      const proximo = r.headers.get("location");
      if (!proximo) return null;
      atual = new URL(proximo, atual).toString();
    } catch {
      return null;
    }
  }
  return null;
}

// Devolve { loja, link (seu link de afiliado), pagina (endereço direto na loja) } ou null se não for loja da Rakuten.
// "lojaDetectada" é a loja que o parse-oferta achou; links de lojas conhecidas (Amazon, Shopee...) nem são abertos.
export async function prepararLinkRakuten(link, lojaDetectada = "Outras") {
  let u;
  try {
    u = new URL(String(link || "").trim());
  } catch {
    return null;
  }
  const pareceRakuten = /netshoes|linksynergy|rakuten/i.test(u.hostname) || lojaDetectada === "Outras";
  if (!pareceRakuten && lojaDetectada !== "Netshoes") return null;

  const destino = lojaDoHost(u.hostname) ? u.toString() : await descobrirDestino(u.toString());
  if (!destino) return null;
  const cfg = lojaDoHost(new URL(destino).hostname);
  if (!cfg) return null;
  const pagina = paginaLimpa(destino);
  return { loja: cfg.loja, pagina, link: deepLink(cfg, pagina) };
}
