// Confere se uma foto é mesmo do PRODUTO (e não o logo da loja, o banner de um encurtador
// de links ou a imagem de propaganda de outro site).
// Salve como lib/foto-valida.mjs. Usado por lib/imagem.js, lib/extrair-oferta.mjs,
// lib/salvar-oferta.js e scripts/corrigir-imagens.mjs.

// Sites de lojas (página onde a foto de prévia costuma ser a do produto)
const LOJAS =
  /(^|\.)(amazon\.com(\.br)?|mercadolivre\.com(\.br)?|mercadolibre\.com|shopee\.com\.br|aliexpress\.(com|us)|kabum\.com\.br|magazineluiza\.com\.br|magalu\.com|netshoes\.com\.br|dafiti\.com\.br|casasbahia\.com\.br|pontofrio\.com\.br|extra\.com\.br|americanas\.com\.br|submarino\.com\.br|terabyteshop\.com\.br|pichau\.com\.br|carrefour\.com\.br|centauro\.com\.br|lojasrenner\.com\.br|cea\.com\.br|riachuelo\.com\.br|hering\.com\.br|nike\.com\.br|adidas\.com\.br|fastshop\.com\.br|leroymerlin\.com\.br|madeiramadeira\.com\.br|boticario\.com\.br|sephora\.com\.br|belezanaweb\.com\.br|natura\.com\.br|drogasil\.com\.br|zattini\.com\.br)$/i;

export function ehSiteDeLoja(url) {
  try {
    return LOJAS.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

// Páginas de loja que NÃO são de um produto (vitrine, campanha, link de afiliado ainda redirecionando)
export function ehPaginaDeProduto(url, html = "") {
  let u;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  const h = u.hostname.toLowerCase();
  const p = u.pathname;
  if (/aliexpress\./.test(h)) return /\/item\/\d+/.test(p);
  if (/amazon\./.test(h)) return /\/(dp|gp\/product|gp\/aw\/d)\//i.test(p);
  if (/mercadoli[bv]re\./.test(h)) return /MLB-?\d|\/p\/MLB/i.test(url);
  if (/shopee\./.test(h)) return /-i\.\d+\.\d+|\/product\/\d+\/\d+/.test(p);
  // outras lojas: a página precisa se declarar como produto
  return (
    /<meta[^>]+(?:property|name)=["']og:type["'][^>]*content=["'](?:og:)?product/i.test(html) ||
    /<script[^>]+application\/ld\+json[^>]*>[^<]*"@type"\s*:\s*"Product"/i.test(html)
  );
}

// Nome do arquivo com cara de logo, banner ou imagem padrão de compartilhamento
// (só palavras inteiras no caminho, para não recusar "capa-de-silicone" por causa de "icon")
const GENERICA =
  /(^|[\/_.-])(logos?|logotipo|brand|share|og[-_]?image|opengraph|default|placeholder|sem[-_]?foto|no[-_]?image|sprite|favicon|apple-touch-icon|icons?|banners?|social|campanha)([\/_.-]|$)/i;

export function fotoGenerica(url) {
  if (!url) return true;
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return true;
    return GENERICA.test(u.pathname);
  } catch {
    return true;
  }
}

// Foto vinda de onde nós mesmos guardamos (foto da postagem do Telegram) ou da API da loja
export function fotoDeConfianca(url) {
  try {
    const h = new URL(url).hostname;
    return /\.supabase\.co$/.test(h) || /amazon-adsystem\.com$|media-amazon\.com$/.test(h);
  } catch {
    return false;
  }
}

// Decisão final: pode usar essa foto? (paginaUrl = página de onde ela foi tirada, se for o caso)
export function fotoAceitavel(foto, paginaUrl = null, html = "") {
  if (!foto || fotoGenerica(foto)) return false;
  if (fotoDeConfianca(foto)) return true;
  if (!paginaUrl) return true; // veio de uma API da loja
  return ehSiteDeLoja(paginaUrl) && ehPaginaDeProduto(paginaUrl, html);
}
