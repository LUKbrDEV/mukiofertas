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

const TEMPO_LIMITE_MS = 8000;
const NAVEGADOR = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9",
  Accept: "text/html,application/xhtml+xml",
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

async function abrir(link) {
  const resposta = await fetch(link, {
    redirect: "follow",
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    headers: NAVEGADOR,
  });
  const html = resposta.ok ? await resposta.text() : "";
  return { ok: resposta.ok, url: (resposta.url || link).toLowerCase(), html };
}

// ---------- Páginas das lojas ----------

// Amazon: o preço riscado fica numa tag "a-text-price" / data-a-strike
function precoDaAmazon(html) {
  const padroes = [
    /data-a-strike="true"[^>]*>\s*<span[^>]*class="a-offscreen"[^>]*>\s*R\$\s*([\d.]+,\d{2})/i,
    /class="a-price a-text-price[^"]*"[^>]*>\s*<span[^>]*class="a-offscreen"[^>]*>\s*R\$\s*([\d.]+,\d{2})/i,
    /"basisPrice"[^}]*?"amount"\s*:\s*([\d.]+)/i,
  ];
  for (const padrao of padroes) {
    const m = html.match(padrao);
    if (m) return paraNumero(m[1].includes(",") ? m[1] : m[1].replace(".", ","));
  }
  return null;
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

// ---------- Função usada pelo salvar-oferta.js ----------
export async function buscarPrecoAntigo(link, precoAtual) {
  try {
    const l = String(link).toLowerCase();
    let antigo = null;

    if (/shopee|shp\.ee/.test(l)) antigo = await antigoShopee(link, precoAtual);
    else if (/aliexpress|s\.click\.ali/.test(l)) antigo = await antigoAliExpress(link);
    else {
      const { ok, url, html } = await abrir(link);
      if (!ok) return null;
      if (url.includes("shopee.")) antigo = await antigoShopee(url, precoAtual);
      else if (url.includes("aliexpress.")) antigo = await antigoAliExpress(url);
      else if (url.includes("amazon.")) antigo = precoDaAmazon(html);
      else if (url.includes("mercadolivre") || url.includes("mercadolibre")) antigo = precoDoMercadoLivre(html);
      else antigo = precoGenerico(html);
    }

    return plausivel(antigo, precoAtual) ? antigo : null;
  } catch {
    return null; // qualquer falha: segue sem preço antigo
  }
}
