// Busca a foto do PRODUTO a partir do link da oferta.
// Salve como lib/foto-produto.mjs. Usado por lib/imagem.js, lib/extrair-oferta.mjs e scripts/corrigir-imagens.mjs.
import { ehSiteDeLoja, fotoAceitavel } from "./foto-valida.mjs";

// ---------- Foto pelo link do produto ----------
// Antes: pegava a "imagem de prévia" (og:image) de qualquer página que o link abrisse.
// Problema: links encurtados (amaznlink.com, s.click.aliexpress...) abrem uma página intermediária,
// e a prévia dela é a propaganda do encurtador ou o logo da loja, não o produto.
// Agora: segue o encurtador até a loja, só aceita foto de PÁGINA DE PRODUTO e, na Amazon,
// usa a foto oficial do programa de associados (não lê a página da Amazon).

const NAVEGADOR = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9",
};
const AMAZON_TAG = process.env.AMAZON_TAG || "mukiofertas-20";

async function abrir(link, ms = 6000) {
  const r = await fetch(link, { redirect: "follow", signal: AbortSignal.timeout(ms), headers: NAVEGADOR });
  const html = r.ok ? (await r.text()).slice(0, 400000) : "";
  return { url: r.url || link, html, ok: r.ok };
}

// Página intermediária que redireciona por JavaScript ou <meta refresh>: descobre o destino
function destinoNoHtml(html, base) {
  const achados = [
    html.match(/<meta[^>]+http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"'>\s]+)/i)?.[1],
    html.match(/(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/i)?.[1],
    html.match(/location\.replace\(\s*["']([^"']+)["']/i)?.[1],
    // qualquer link de loja conhecido dentro da página
    html.match(/https?:\/\/(?:www\.)?(?:amazon\.com\.br|amzn\.to|mercadolivre\.com\.br|produto\.mercadolivre\.com\.br|meli\.la|shopee\.com\.br|s\.shopee\.com\.br|[a-z]+\.aliexpress\.com|s\.click\.aliexpress\.com|kabum\.com\.br)[^"'<>\s\\]*/i)?.[0],
  ].filter(Boolean);
  for (const a of achados) {
    try {
      const u = new URL(a.replace(/&amp;/g, "&"), base);
      if (/^https?:$/.test(u.protocol) && u.toString() !== base) return u.toString();
    } catch {}
  }
  return null;
}

const asinDe = (url) => String(url ?? "").match(/\/(?:dp|gp\/product|gp\/aw\/d|product)\/([A-Z0-9]{10})(?:[/?#]|$)/i)?.[1]?.toUpperCase() ?? null;

// Link amzn.to: descobre o endereço final sem abrir a página da Amazon
async function seguirSemAbrir(link) {
  try {
    const r = await fetch(link, { redirect: "manual", signal: AbortSignal.timeout(6000), headers: NAVEGADOR });
    const destino = r.headers.get("location");
    return destino ? new URL(destino, link).toString() : link;
  } catch {
    return link;
  }
}

// A foto existe mesmo? (o widget da Amazon devolve um GIF minúsculo quando não acha o produto)
async function fotoExiste(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000), headers: NAVEGADOR });
    if (!r.ok || !/^image\//i.test(r.headers.get("content-type") ?? "")) return false;
    const bytes = (await r.arrayBuffer()).byteLength;
    return bytes > 2000;
  } catch {
    return false;
  }
}

// Foto oficial do produto pelo programa de associados da Amazon (sem ler a página da loja)
export async function imagemAmazon(asin) {
  if (!asin) return null;
  const url =
    `https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN=${asin}&Format=_SL500_` +
    `&ID=AsinImage&MarketPlace=BR&ServiceVersion=20070822&WS=1&tag=${encodeURIComponent(AMAZON_TAG)}`;
  return (await fotoExiste(url)) ? url : null;
}

function fotoDaPagina(html) {
  // 1) JSON-LD do produto
  for (const [, texto] of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const dados = JSON.parse(texto.trim());
      const lista = [dados, ...(Array.isArray(dados) ? dados : []), ...(dados?.["@graph"] ?? [])].flat();
      const p = lista.find((x) => x && /product/i.test(String(x["@type"])));
      const img = [p?.image].flat().filter(Boolean)[0];
      const url = typeof img === "string" ? img : img?.url;
      if (url?.startsWith("http")) return url;
    } catch {}
  }
  // 2) og:image
  const m =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return m && m[1].startsWith("http") ? m[1].replace(/&amp;/g, "&") : null;
}

// Tenta pegar a foto do produto a partir do link da oferta. Devolve null se não tiver certeza.
export async function imagemDoLink(link) {
  try {
    if (!link) return null;
    let url = link;

    // Amazon: nunca lê a página (termos da Amazon); só descobre o código do produto
    let asin = asinDe(url);
    if (!asin && /(^|\.)(amzn\.to|amzn\.com|a\.co)$/i.test(new URL(url).hostname)) asin = asinDe(await seguirSemAbrir(url));
    if (asin) return imagemAmazon(asin);

    let pagina = await abrir(url);
    // ainda numa página intermediária (encurtador): tenta seguir até a loja (no máximo 2 saltos)
    for (let salto = 0; salto < 2 && !ehSiteDeLoja(pagina.url); salto++) {
      const destino = destinoNoHtml(pagina.html, pagina.url);
      if (!destino) break;
      if (/(^|\.)(amzn\.to|amzn\.com|a\.co)$/i.test(new URL(destino).hostname)) {
        asin = asinDe(await seguirSemAbrir(destino));
      } else {
        asin = asinDe(destino);
      }
      if (asin) return imagemAmazon(asin);
      pagina = await abrir(destino);
    }
    if (!pagina.ok) return null;

    asin = asinDe(pagina.url);
    if (asin) return imagemAmazon(asin);

    const foto = fotoDaPagina(pagina.html);
    return fotoAceitavel(foto, pagina.url, pagina.html) ? foto : null;
  } catch {
    return null;
  }
}