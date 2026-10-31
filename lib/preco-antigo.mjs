// Tenta descobrir o preço "antes" (o preço "de") de uma oferta do Telegram que não trouxe esse preço.
// Salve como lib/preco-antigo.mjs
//
// Ordem:
//   1) Shopee e AliExpress: pela API de afiliados (funciona de servidor, as páginas não mostram preço a robôs)
//   2) Outras lojas: lendo a página do produto (Amazon, Mercado Livre, KaBuM!, Magalu, lojas VTEX...)
// Se não conseguir (loja bloqueou, página mudou, não existe preço riscado), devolve null.
// Amazon e Mercado Livre costumam bloquear quem vem de servidor (Vercel): nesses casos
// o ideal é a própria postagem do canal trazer o "De R$ X por R$ Y".

import { chamarShopee, shopeeConfigurada } from "../scripts/fontes/shopee.mjs";
import { chamarAliExpress, aliexpressConfigurado } from "../scripts/fontes/aliexpress.mjs";

const TEMPO_LIMITE_MS = 7000;
// Cabeçalhos de um navegador de verdade (a Amazon recusa pedidos "pelados")
const NAVEGADOR = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.6,en;q=0.5",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Ch-Ua": '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
};

function paraNumero(texto) {
  if (texto === null || texto === undefined) return null;
  let s = String(texto).trim().replace(/[^\d.,]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Segurança: só aceita se for maior que o preço atual e o desconto for plausível (5% a 85%)
function plausivel(antigo, atual) {
  if (!antigo || !atual || antigo <= atual) return false;
  const desconto = (antigo - atual) / antigo;
  return desconto >= 0.05 && desconto <= 0.85;
}

// Página de bloqueio/captcha (Amazon e outras)
const BLOQUEIO = /captcha|opfcaptcha|robot check|api-services-support@amazon|digite os caracteres|enter the characters|desculpe.{0,40}algo deu errado|just a moment|cf-chl/i;

async function abrir(link, cookies = "") {
  const resposta = await fetch(link, {
    redirect: "follow",
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    headers: cookies ? { ...NAVEGADOR, Cookie: cookies } : NAVEGADOR,
  });
  const html = await resposta.text().catch(() => "");
  const bloqueado = [403, 429, 503].includes(resposta.status) || BLOQUEIO.test(html.slice(0, 20000));
  // a Amazon às vezes responde 503 no 1º acesso e libera no 2º, com os cookies da sessão
  const novosCookies = (resposta.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(";")[0])
    .join("; ");
  return {
    ok: resposta.ok && !bloqueado,
    status: resposta.status,
    bloqueado,
    cookies: novosCookies,
    url: (resposta.url || link).toLowerCase(),
    html: resposta.ok && !bloqueado ? html : "",
  };
}

async function abrirComNovaTentativa(link) {
  const primeira = await abrir(link);
  if (!primeira.bloqueado) return primeira;
  // 2ª tentativa no endereço final, com os cookies que a loja mandou
  return abrir(primeira.url || link, primeira.cookies).catch(() => primeira);
}

// &nbsp; e outros códigos do HTML viram texto normal
const limparHtml = (html) =>
  html
    .replace(/&nbsp;|&#160;|&#xa0;|\u00a0/gi, " ")
    .replace(/&#36;|&dollar;/gi, "$")
    .replace(/\s+/g, " ");

// ---------- Páginas das lojas ----------

// Amazon: o preço riscado ("De:", "Preço anterior", "Preço recomendado") fica num
// <span class="a-price a-text-price" data-a-strike="true"><span class="a-offscreen">R$&nbsp;59,90</span>
// Procura primeiro no quadro de preço do produto principal (a página tem preços de outros produtos
// nos carrosséis, que não servem).
const QUADROS_DE_PRECO_AMAZON = [
  'id="corePriceDisplay_desktop_feature_div"',
  'id="corePrice_desktop"',
  'id="corePrice_feature_div"',
  'id="apex_desktop"',
  'id="apex_offerDisplay_desktop"',
  'id="price"',
  'id="buybox"',
];

function precoDaAmazon(htmlBruto) {
  const html = limparHtml(htmlBruto);
  const trechos = [];
  for (const marca of QUADROS_DE_PRECO_AMAZON) {
    const i = html.indexOf(marca);
    if (i >= 0) trechos.push(html.slice(i, i + 12000));
  }
  const reais = "R\\$\\s*([\\d.]+,\\d{2})";
  const padroes = [
    new RegExp(`data-a-strike="true"[^>]*>\\s*<span[^>]*a-offscreen[^>]*>\\s*${reais}`, "i"),
    new RegExp(`class="a-price a-text-price[^"]*"[^>]*>\\s*<span[^>]*a-offscreen[^>]*>\\s*${reais}`, "i"),
    new RegExp(`basisPrice[^>]*>[\\s\\S]{0,400}?a-offscreen[^>]*>\\s*${reais}`, "i"),
    new RegExp(`(?:\\bDe:|Preço anterior:?|Preço recomendado:?|Pre&ccedil;o anterior:?)\\s*(?:<[^>]+>\\s*)*${reais}`, "i"),
    new RegExp(`class="a-text-price"[^>]*>[\\s\\S]{0,200}?${reais}`, "i"),
  ];
  // 1) no quadro de preço do produto; 2) na página toda (último recurso)
  for (const alvo of [...trechos, html]) {
    for (const re of padroes) {
      const m = alvo.match(re);
      if (m) return paraNumero(m[1]);
    }
  }
  // dados da página em JSON
  const json = html.match(/"(?:basisPrice|listPrice|strikethroughPrice|wasPrice)"\s*:\s*\{[^}]*?"amount"\s*:\s*([\d.]+)/i);
  return json ? Number(json[1]) : null;
}

// Mercado Livre: o preço antigo vem com o texto "Antes: 1299 reais com 90 centavos"
function precoDoMercadoLivre(html) {
  const tag = html.match(/<[^>]*andes-money-amount--previous[^>]*>/i);
  if (tag) {
    const m = tag[0].match(/aria-label="Antes:\s*([\d.]+)\s*reais(?:\s*com\s*(\d+)\s*centavos)?/i);
    if (m) return Number(m[1].replace(/\./g, "")) + (m[2] ? Number(m[2]) / 100 : 0);
  }
  const m2 = html.match(/"original_price"\s*:\s*([\d.]+)/i);
  return m2 ? Number(m2[1]) : null;
}

// Outras lojas: campos comuns de "preço de" nos dados da página
function precoGenerico(html) {
  const padroes = [
    /"oldPrice"\s*:\s*"?([\d.]+)/i, // KaBuM! e outras
    /"listPrice"\s*:\s*"?([\d.]+)/i, // lojas VTEX, Magalu
    /"originalPrice"\s*:\s*"?([\d.]+)/i,
    /"priceFrom"\s*:\s*"?([\d.]+)/i,
    /"original_price"\s*:\s*"?([\d.]+)/i,
  ];
  for (const re of padroes) {
    const m = html.match(re);
    if (m) {
      // valores em JSON vêm como 1299.9 (ponto decimal)
      const n = Number(m[1]);
      if (n > 0) return n;
    }
  }
  return null;
}

// ---------- APIs de afiliados ----------

async function antigoShopee(link, precoAtual) {
  if (!shopeeConfigurada()) return null;
  const { url, html } = await abrir(link);
  const alvo = `${url} ${html.slice(0, 20000)}`;
  const m = alvo.match(/-i\.(\d+)\.(\d+)/) || alvo.match(/\/product\/(\d+)\/(\d+)/);
  if (!m) return null;
  const dados = await chamarShopee(
    `{ productOfferV2(itemId: ${m[2]}, shopId: ${m[1]}, limit: 1) { nodes { priceMin priceDiscountRate } } }`
  );
  const no = dados?.productOfferV2?.nodes?.[0];
  const taxa = Number(no?.priceDiscountRate ?? 0);
  if (!(taxa > 0 && taxa < 95)) return null;
  const base = precoAtual || Number(no.priceMin);
  return Math.round((base / (1 - taxa / 100)) * 100) / 100;
}

async function antigoAliExpress(link) {
  if (!aliexpressConfigurado()) return null;
  const { url, html } = await abrir(link);
  const m = `${url} ${html.slice(0, 20000)}`.match(/\/item\/(\d{6,})\.html/);
  if (!m) return null;
  const json = await chamarAliExpress("aliexpress.affiliate.productdetail.get", {
    product_ids: m[1],
    target_currency: "BRL",
    target_language: "PT",
    country: "BR",
    tracking_id: process.env.ALIEXPRESS_TRACKING_ID,
  });
  const produto = [].concat(
    json.aliexpress_affiliate_productdetail_get_response?.resp_result?.result?.products?.product ?? []
  )[0];
  return produto ? paraNumero(produto.target_original_price ?? produto.original_price) : null;
}

// ---------- Funções usadas pelo salvar-oferta.js ----------

// Devolve { preco, motivo }: motivo explica por que não achou (aparece no painel, Saúde do robô)
export async function buscarPrecoAntigoDetalhado(link, precoAtual) {
  try {
    const l = String(link).toLowerCase();
    let antigo = null;
    let loja = "loja";

    if (/shopee|shp\.ee/.test(l)) antigo = await antigoShopee(link, precoAtual);
    else if (/aliexpress|s\.click\.ali/.test(l)) antigo = await antigoAliExpress(link);
    else {
      const pagina = await abrirComNovaTentativa(link);
      loja = /amazon|amzn|a\.co\//.test(pagina.url + l) ? "Amazon" : "loja";
      if (pagina.bloqueado) return { preco: null, motivo: `${loja} bloqueou a leitura da página (HTTP ${pagina.status})` };
      if (!pagina.ok) return { preco: null, motivo: `página respondeu HTTP ${pagina.status}` };
      const { url, html } = pagina;
      if (url.includes("shopee.")) antigo = await antigoShopee(url, precoAtual);
      else if (url.includes("aliexpress.")) antigo = await antigoAliExpress(url);
      else if (url.includes("amazon.")) antigo = precoDaAmazon(html);
      else if (url.includes("mercadolivre") || url.includes("mercadolibre")) antigo = precoDoMercadoLivre(html);
      else antigo = precoGenerico(html);
    }

    if (!antigo) return { preco: null, motivo: `a página da ${loja} não mostra preço riscado` };
    if (!plausivel(antigo, precoAtual))
      return { preco: null, motivo: `preço riscado R$ ${antigo} não bate com o atual R$ ${precoAtual}` };
    return { preco: antigo, motivo: null };
  } catch (e) {
    const motivo = e?.name === "TimeoutError" ? "a página demorou demais para abrir" : `erro ao abrir a página: ${e?.message ?? e}`;
    return { preco: null, motivo };
  }
}

export async function buscarPrecoAntigo(link, precoAtual) {
  return (await buscarPrecoAntigoDetalhado(link, precoAtual)).preco;
}

// Para testes (scripts/testar-preco-antigo.mjs)
export { precoDaAmazon };
