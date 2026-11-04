// Lê um link de produto colado pela comunidade: descobre a loja, puxa título, foto e preços
// e troca o link pelo link de afiliado do MukiOfertas.
// Salve como lib/extrair-oferta.mjs. Usado pelas rotas app/api/comunidade/extrair e /enviar.
//
// Loja            | Informações                         | Link de afiliado
// Shopee          | API de afiliados (productOfferV2)   | offerLink da API (ou generateShortLink)
// AliExpress      | API de afiliados (productdetail)    | promotion_link da API (ou link.generate)
// Mercado Livre   | API do ML (token do lib/detalhes-ml) | matt_word / matt_tool no link
// KaBuM!          | página do produto                    | link da Awin (cread.php)
// Amazon          | só o nome que vem no próprio link    | tag de associado (?tag=)
// Outras lojas    | página do produto (og:, JSON-LD)     | link original (sem afiliado)
//
// Variáveis (Vercel → Settings → Environment Variables):
//   SHOPEE_APP_ID, SHOPEE_SECRET, ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET, ALIEXPRESS_TRACKING_ID,
//   ML_CLIENT_ID, ML_CLIENT_SECRET (já usadas pelo site), NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   (opcionais) AMAZON_TAG, ML_MATT_WORD, ML_MATT_TOOL, AWIN_PUBLISHER_ID, AWIN_KABUM_MID

import { createHash, createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { classificar } from "./classificar.mjs";
import { lerApiML } from "./detalhes-ml.mjs";

// ===== AJUSTES =====
const AMAZON_TAG = process.env.AMAZON_TAG || "mukiofertas-20";
const ML_MATT_WORD = process.env.ML_MATT_WORD || "SALU8855060";
const ML_MATT_TOOL = process.env.ML_MATT_TOOL || "73278866";
const TEMPO_LIMITE_MS = 12000; // cada chamada externa
// ===================

const NAVEGADOR = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const banco = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;

const dinheiro = (v) => {
  if (v === null || v === undefined || v === "") return null;
  let t = String(v).replace(/[^\d.,]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};
const limpar = (t, max = 200) =>
  String(t ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

// ---------- Endereço ----------
export function normalizarLink(texto) {
  const achado = String(texto ?? "").match(/https?:\/\/[^\s<>"']+/i);
  const bruto = achado ? achado[0] : String(texto ?? "").trim();
  try {
    const url = new URL(/^https?:\/\//i.test(bruto) ? bruto : `https://${bruto}`);
    if (!/\./.test(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function lojaDoLink(link) {
  const h = new URL(link).hostname.toLowerCase();
  if (/(^|\.)(amazon\.com\.br|amazon\.com|amzn\.to|amzn\.com|a\.co)$/.test(h)) return "Amazon";
  if (/(^|\.)(mercadolivre\.com(\.br)?|mercadolibre\.com|meli\.la|mlb\.am)$/.test(h)) return "Mercado Livre";
  if (/(^|\.)(shopee\.com\.br|shope\.ee|shp\.ee|s\.shopee\.com\.br)$/.test(h) || h.endsWith(".shopee.com.br")) return "Shopee";
  if (/aliexpress\.(com|us)$|(^|\.)aliexpress\.com$|(^|\.)a\.aliexpress\.com$|s\.click\.aliexpress\.com$/.test(h)) return "AliExpress";
  if (/(^|\.)kabum\.com\.br$/.test(h)) return "KaBuM!";
  if (/(^|\.)magazineluiza\.com\.br$|(^|\.)magalu\.com$/.test(h)) return "Magalu";
  return null;
}

// Segue links curtos (amzn.to, meli.la, s.shopee...) até o endereço final
async function seguir(link) {
  try {
    const r = await fetch(link, { redirect: "follow", headers: NAVEGADOR, signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
    const html = r.ok ? await r.text() : "";
    return { url: r.url || link, html, status: r.status };
  } catch {
    return { url: link, html: "", status: 0 };
  }
}

// ---------- Leitura genérica da página (og:, JSON-LD) ----------
function meta(html, nome) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name|itemprop)=["']${nome}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${nome}["']`,
    "i"
  );
  const m = html.match(re);
  return m ? m[1] || m[2] : null;
}

function produtoJsonLd(html) {
  const blocos = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, texto] of blocos) {
    try {
      const dados = JSON.parse(texto.trim());
      const lista = [dados, ...(Array.isArray(dados) ? dados : []), ...(dados?.["@graph"] ?? [])].flat();
      const p = lista.find((x) => x && /product/i.test(String(x["@type"])));
      if (p) return p;
    } catch {}
  }
  return null;
}

// Preço riscado ("de") no HTML (mesma ideia do robô da KaBuM!)
function precoDe(html) {
  for (const re of [
    /"oldPrice"\s*:\s*"?(\d+(?:\.\d+)?)/i,
    /"listPrice"\s*:\s*"?(\d+(?:\.\d+)?)/i,
    /"originalPrice"\s*:\s*"?(\d+(?:\.\d+)?)/i,
    /"priceFrom"\s*:\s*"?(\d+(?:\.\d+)?)/i,
  ]) {
    const m = html.match(re);
    if (m && Number(m[1]) > 0) return Number(m[1]);
  }
  for (const re of [
    /class="[^"]*old[-_]?price[^"]*"[^>]*>(?:\s*<[^>]+>)*\s*R\$(?:\s|&nbsp;| )*([\d.]+,\d{2})/i,
    /<(?:s|del|strike)\b[^>]*>(?:\s*<[^>]+>)*\s*R\$(?:\s|&nbsp;| )*([\d.]+,\d{2})/i,
    />\s*De:?\s*R\$(?:\s|&nbsp;| )*([\d.]+,\d{2})/i,
  ]) {
    const m = html.match(re);
    if (m) return dinheiro(m[1]);
  }
  return null;
}

function lerPagina(html) {
  if (!html) return {};
  const p = produtoJsonLd(html);
  const oferta = [p?.offers].flat().filter(Boolean)[0];
  const imagem = [p?.image].flat().filter(Boolean)[0];
  return {
    titulo: limpar(p?.name || meta(html, "og:title") || html.match(/<title>([^<]+)/i)?.[1]),
    imagem: (typeof imagem === "string" ? imagem : imagem?.url) || meta(html, "og:image") || null,
    preco_atual:
      dinheiro(oferta?.price ?? oferta?.lowPrice) ??
      dinheiro(meta(html, "product:price:amount")) ??
      dinheiro(meta(html, "og:price:amount")) ??
      dinheiro(meta(html, "price")),
    preco_antigo: precoDe(html),
  };
}

const bloqueada = (r) => [403, 429, 503].includes(r.status) || /just a moment|cf-chl|captcha|access denied/i.test(r.html.slice(0, 5000));

// ---------- Amazon ----------
async function amazon(link) {
  let url = link;
  let asin = url.match(/\/(?:dp|gp\/product|gp\/aw\/d|product)\/([A-Z0-9]{10})/i)?.[1];
  if (!asin) {
    // link curto (amzn.to): só descobre para onde ele leva, sem ler a página
    try {
      const r = await fetch(link, { redirect: "manual", headers: NAVEGADOR, signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
      const destino = r.headers.get("location");
      if (destino) url = new URL(destino, link).toString();
    } catch {}
    asin = url.match(/\/(?:dp|gp\/product|gp\/aw\/d|product)\/([A-Z0-9]{10})/i)?.[1];
  }
  if (!asin) return { avisos: ["Não encontramos o código do produto no link da Amazon. Use o link da página do produto."] };
  asin = asin.toUpperCase();

  // Os termos da Amazon não permitem ler as páginas da loja: usamos só o nome que vem no link
  const trecho = decodeURIComponent(new URL(url).pathname.split(/\/(?:dp|gp)\//i)[0].split("/").filter(Boolean).pop() || "");
  const titulo = /[a-z]{3}/i.test(trecho) && !/^(dp|gp|s)$/i.test(trecho) ? limpar(trecho.replace(/-/g, " ")) : "";

  return {
    titulo,
    link_afiliado: `https://www.amazon.com.br/dp/${asin}?tag=${encodeURIComponent(AMAZON_TAG)}`,
    afiliado: true,
    codigo: asin,
    avisos: ["Na Amazon, confira o título e preencha os preços à mão (a Amazon não permite ler os preços automaticamente)."],
  };
}

// ---------- Mercado Livre ----------
function codigoML(texto) {
  const doItem = texto.match(/[?&#;](?:item_id|wid)=(MLB\d{6,})/i);
  if (doItem) return { tipo: "item", id: doItem[1].toUpperCase() };
  const doCatalogo = texto.match(/\/p\/(MLB\d{6,})/i);
  if (doCatalogo) return { tipo: "produto", id: doCatalogo[1].toUpperCase() };
  const doAnuncio = texto.match(/MLB-?(\d{8,})/i);
  if (doAnuncio) return { tipo: "item", id: `MLB${doAnuncio[1]}` };
  return null;
}

function linkAfiliadoML(endereco) {
  const u = new URL(endereco);
  for (const k of [...u.searchParams.keys()]) if (/^(matt_|ref$|forceInApp$|tracking_id$|source$)/i.test(k)) u.searchParams.delete(k);
  u.hash = "";
  u.searchParams.set("matt_word", ML_MATT_WORD);
  u.searchParams.set("matt_tool", ML_MATT_TOOL);
  return u.toString();
}

async function mercadoLivre(link) {
  let alvo = codigoML(link);
  let pagina = null;
  if (!alvo) {
    pagina = await seguir(link);
    alvo = codigoML(pagina.url) || codigoML(pagina.html);
  }
  if (!alvo) return { avisos: ["Não encontramos o anúncio do Mercado Livre nesse link."] };

  let dados = {};
  let permalink = null;
  try {
    if (alvo.tipo === "produto") {
      const p = await lerApiML(`/products/${alvo.id}`);
      if (p) {
        const vencedor = p.buy_box_winner ?? {};
        dados = {
          titulo: limpar(p.name),
          imagem: p.pictures?.[0]?.url ?? null,
          preco_atual: dinheiro(vencedor.price),
          preco_antigo: dinheiro(vencedor.original_price),
        };
        permalink = p.permalink || `https://www.mercadolivre.com.br/p/${alvo.id}`;
      }
    } else {
      const i = await lerApiML(`/items/${alvo.id}`);
      if (i) {
        dados = {
          titulo: limpar(i.title),
          imagem: i.pictures?.[0]?.secure_url ?? i.secure_thumbnail ?? null,
          preco_atual: dinheiro(i.price),
          preco_antigo: dinheiro(i.original_price),
        };
        permalink = i.permalink;
      }
    }
  } catch {}

  // API sem resposta: tenta ler a página
  if (!dados.titulo || !dados.preco_atual) {
    pagina ??= await seguir(link);
    if (!bloqueada(pagina)) {
      const lido = lerPagina(pagina.html);
      dados = { ...lido, ...Object.fromEntries(Object.entries(dados).filter(([, v]) => v)) };
      permalink ??= /mercadolivre\.com\.br\/(?!social)/.test(pagina.url) ? pagina.url : null;
    }
  }
  permalink ??=
    alvo.tipo === "produto"
      ? `https://www.mercadolivre.com.br/p/${alvo.id}`
      : `https://produto.mercadolivre.com.br/${alvo.id.replace(/^MLB/, "MLB-")}`;

  return { ...dados, link_afiliado: linkAfiliadoML(permalink), afiliado: true, codigo: alvo.id };
}

// ---------- Shopee ----------
function idsShopee(texto) {
  const t = decodeURIComponent(String(texto));
  const m =
    t.match(/-i\.(\d+)\.(\d+)/) ||
    t.match(/\/product\/(\d+)\/(\d+)/) ||
    t.match(/\/opaanlp\/(\d+)\/(\d+)/) ||
    t.match(/[?&]shopid=(\d+)[^#]*?[?&]itemid=(\d+)/i) ||
    t.match(/\/(\d{5,})\/(\d{6,})(?:[/?#]|$)/);
  return m ? { shopId: m[1], itemId: m[2] } : null;
}

async function chamarShopee(query) {
  const appId = String(process.env.SHOPEE_APP_ID ?? "").trim();
  const secret = String(process.env.SHOPEE_SECRET ?? "").trim();
  if (!appId || !secret) throw new Error("Shopee não configurada (SHOPEE_APP_ID e SHOPEE_SECRET na Vercel)");
  const corpo = JSON.stringify({ query });
  const ts = Math.floor(Date.now() / 1000);
  const assinatura = createHash("sha256").update(`${appId}${ts}${corpo}${secret}`).digest("hex");
  const r = await fetch(process.env.SHOPEE_API_URL || "https://open-api.affiliate.shopee.com.br/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `SHA256 Credential=${appId}, Timestamp=${ts}, Signature=${assinatura}`,
    },
    body: corpo,
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
  });
  const json = await r.json();
  if (json.errors?.length) throw new Error(`Shopee: ${json.errors[0].message}`);
  return json.data;
}

async function shopee(link) {
  let ids = idsShopee(link);
  let final = link;
  if (!ids) {
    const p = await seguir(link);
    final = p.url;
    ids = idsShopee(p.url) || idsShopee(p.html);
  }

  let dados = {};
  let linkAfiliado = null;
  const avisos = [];
  if (ids) {
    try {
      const data = await chamarShopee(
        `{ productOfferV2(itemId: ${Number(ids.itemId)}, shopId: ${Number(ids.shopId)}, page: 1, limit: 1) { nodes { productName priceMin priceMax priceDiscountRate imageUrl offerLink productLink } } }`
      );
      const p = data?.productOfferV2?.nodes?.[0];
      if (p) {
        const atual = dinheiro(p.priceMin ?? p.priceMax);
        const desc = Number(p.priceDiscountRate ?? 0);
        dados = {
          titulo: limpar(p.productName),
          imagem: p.imageUrl || null,
          preco_atual: atual,
          preco_antigo: atual && desc > 0 && desc < 95 ? Math.round((atual / (1 - desc / 100)) * 100) / 100 : null,
        };
        linkAfiliado = p.offerLink || null;
      }
    } catch (e) {
      avisos.push(e.message);
    }
  }

  // Produto fora do programa de afiliados ou link diferente: gera um link curto de afiliado
  if (!linkAfiliado) {
    try {
      const destino = ids ? `https://shopee.com.br/product/${ids.shopId}/${ids.itemId}` : final;
      const data = await chamarShopee(
        `mutation { generateShortLink(input: { originUrl: ${JSON.stringify(destino)}, subIds: ["comunidade"] }) { shortLink } }`
      );
      linkAfiliado = data?.generateShortLink?.shortLink ?? null;
    } catch (e) {
      avisos.push(e.message);
    }
  }
  if (!ids) avisos.push("Não encontramos o produto da Shopee nesse link: preencha título e preço.");
  return { ...dados, link_afiliado: linkAfiliado, afiliado: Boolean(linkAfiliado), codigo: ids?.itemId, avisos };
}

// ---------- AliExpress ----------
async function chamarAli(metodo, extras) {
  const chave = String(process.env.ALIEXPRESS_APP_KEY ?? "").trim();
  const segredo = String(process.env.ALIEXPRESS_APP_SECRET ?? "").trim();
  if (!chave || !segredo) throw new Error("AliExpress não configurado (ALIEXPRESS_APP_KEY e ALIEXPRESS_APP_SECRET na Vercel)");
  const p = { app_key: chave, method: metodo, timestamp: String(Date.now()), sign_method: "sha256", ...extras };
  const texto = Object.keys(p).sort().map((k) => `${k}${p[k]}`).join("");
  p.sign = createHmac("sha256", segredo).update(texto, "utf8").digest("hex").toUpperCase();
  const r = await fetch("https://api-sg.aliexpress.com/sync", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams(p).toString(),
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
  });
  const json = await r.json();
  if (json.error_response) throw new Error(`AliExpress: ${json.error_response.msg || json.error_response.code}`);
  return json;
}

const idAli = (t) => decodeURIComponent(String(t)).match(/\/item\/(\d{6,})\.html|[?&](?:productId|product_id)=(\d{6,})/i);

async function aliexpress(link) {
  let m = idAli(link);
  if (!m) {
    const p = await seguir(link);
    m = idAli(p.url) || idAli(p.html);
  }
  const id = m ? m[1] || m[2] : null;
  const tracking = process.env.ALIEXPRESS_TRACKING_ID;
  const avisos = [];
  let dados = {};
  let linkAfiliado = null;

  if (id) {
    try {
      const json = await chamarAli("aliexpress.affiliate.productdetail.get", {
        product_ids: id,
        target_currency: "BRL",
        target_language: "PT",
        country: "BR",
        tracking_id: tracking,
      });
      const p = json?.aliexpress_affiliate_productdetail_get_response?.resp_result?.result?.products?.product?.[0];
      if (p) {
        dados = {
          titulo: limpar(p.product_title),
          imagem: p.product_main_image_url || null,
          preco_atual: dinheiro(p.target_sale_price ?? p.sale_price),
          preco_antigo: dinheiro(p.target_original_price ?? p.original_price),
        };
        linkAfiliado = p.promotion_link || null;
      }
    } catch (e) {
      avisos.push(e.message);
    }
  }
  if (!linkAfiliado) {
    try {
      const json = await chamarAli("aliexpress.affiliate.link.generate", {
        promotion_link_type: 0,
        source_values: id ? `https://pt.aliexpress.com/item/${id}.html` : link,
        tracking_id: tracking,
      });
      linkAfiliado =
        json?.aliexpress_affiliate_link_generate_response?.resp_result?.result?.promotion_links?.promotion_link?.[0]
          ?.promotion_link ?? null;
    } catch (e) {
      avisos.push(e.message);
    }
  }
  if (!id) avisos.push("Não encontramos o produto do AliExpress nesse link: preencha título e preço.");
  return { ...dados, link_afiliado: linkAfiliado, afiliado: Boolean(linkAfiliado), codigo: id, avisos };
}

// ---------- KaBuM! (Awin) ----------
let awinEmCache = null;
async function idsAwinKabum() {
  if (awinEmCache) return awinEmCache;
  let mid = process.env.AWIN_KABUM_MID || null;
  let aff = process.env.AWIN_PUBLISHER_ID || null;
  if (!mid || !aff) {
    // pega dos links da KaBuM! que o robô já colocou no site (vêm prontos da Awin)
    const db = banco();
    const { data } = db
      ? await db.from("ofertas").select("link").like("id_externo", "awn-kbm-%").like("link", "%awin%").limit(1)
      : { data: [] };
    const exemplo = data?.[0]?.link;
    if (exemplo) {
      const u = new URL(exemplo);
      mid ??= u.searchParams.get("awinmid") || u.searchParams.get("m") || u.searchParams.get("mid");
      aff ??= u.searchParams.get("awinaffid") || u.searchParams.get("a") || u.searchParams.get("affid");
    }
  }
  awinEmCache = mid && aff ? { mid, aff } : null;
  return awinEmCache;
}

async function kabum(link) {
  const pagina = await seguir(link);
  const limpo = (() => {
    const u = new URL(pagina.url || link);
    u.search = "";
    u.hash = "";
    return u.toString();
  })();
  const dados = bloqueada(pagina) ? {} : lerPagina(pagina.html);
  const awin = await idsAwinKabum();
  const avisos = [];
  if (!dados.titulo) avisos.push("A KaBuM! não deixou ler a página agora: preencha título e preço.");
  if (!awin) avisos.push("Link da Awin não configurado (AWIN_PUBLISHER_ID e AWIN_KABUM_MID): o link ficou sem afiliado.");
  return {
    ...dados,
    link_afiliado: awin
      ? `https://www.awin1.com/cread.php?awinmid=${awin.mid}&awinaffid=${awin.aff}&ued=${encodeURIComponent(limpo)}`
      : limpo,
    afiliado: Boolean(awin),
    codigo: limpo.match(/\/produto\/(\d+)/)?.[1],
    avisos,
  };
}

// ---------- Outras lojas ----------
async function outraLoja(link) {
  const pagina = await seguir(link);
  const dados = bloqueada(pagina) ? {} : lerPagina(pagina.html);
  const host = new URL(pagina.url || link).hostname.replace(/^www\./, "");
  const nome = host.split(".")[0];
  return {
    ...dados,
    loja: nome.charAt(0).toUpperCase() + nome.slice(1),
    link_afiliado: pagina.url || link,
    afiliado: false,
    avisos: ["Essa loja não está nos nossos programas de afiliado: o link vai como está."],
  };
}

// ---------- Oferta repetida ----------
async function jaNoSite(loja, codigo) {
  const db = banco();
  if (!db || !codigo) return null;
  let consulta = db.from("ofertas").select("id, titulo, preco_atual").eq("ativa", true).limit(1);
  if (loja === "Shopee") consulta = consulta.eq("id_externo", `shp-${codigo}`);
  else if (loja === "AliExpress") consulta = consulta.eq("id_externo", `ali-${codigo}`);
  else consulta = consulta.ilike("link", `%${codigo}%`);
  const { data } = await consulta;
  const o = data?.[0];
  if (!o) return null;
  return { id: o.id, titulo: o.titulo, preco_atual: o.preco_atual };
}

// ---------- Principal ----------
const POR_LOJA = { Amazon: amazon, "Mercado Livre": mercadoLivre, Shopee: shopee, AliExpress: aliexpress, "KaBuM!": kabum };

export async function extrairOferta(texto) {
  const link = normalizarLink(texto);
  if (!link) return { erro: "Cole um link válido, começando com https://" };

  const loja = lojaDoLink(link);
  const leitor = POR_LOJA[loja] ?? outraLoja;
  let r;
  try {
    r = await leitor(link);
  } catch (e) {
    r = { avisos: [`Não foi possível ler o link: ${e.message}`] };
  }

  // Faltou título ou preço (API sem resposta, chave faltando...): tenta ler a própria página da loja
  // (a Amazon fica de fora: os termos dela não permitem)
  if ((!r.titulo || !r.preco_atual) && loja !== "Amazon" && !r._paginaLida) {
    const pagina = await seguir(link);
    if (pagina.html && !bloqueada(pagina)) {
      const lido = lerPagina(pagina.html);
      r.titulo ||= lido.titulo;
      r.imagem ||= lido.imagem;
      r.preco_atual ??= lido.preco_atual;
      r.preco_antigo ??= lido.preco_antigo;
    }
    if (!r.titulo || !r.preco_atual) {
      r.avisos = [
        ...(r.avisos ?? []),
        pagina.status && bloqueada(pagina)
          ? `A ${loja || "loja"} bloqueou a leitura automática agora: confira e preencha o que faltar.`
          : `Não conseguimos ler ${!r.titulo ? "o título" : ""}${!r.titulo && !r.preco_atual ? " e " : ""}${!r.preco_atual ? "o preço" : ""} automaticamente: preencha à mão.`,
      ];
    }
  }

  const resultado = {
    loja: loja || r.loja || "Outra loja",
    titulo: r.titulo || "",
    imagem: r.imagem || null,
    preco_atual: r.preco_atual ?? null,
    preco_antigo: r.preco_antigo && r.preco_atual && r.preco_antigo > r.preco_atual ? r.preco_antigo : null,
    link_original: link,
    link_afiliado: r.link_afiliado || link,
    afiliado: Boolean(r.afiliado && r.link_afiliado),
    avisos: (r.avisos ?? []).filter(Boolean),
    categoria: null,
    duplicada: null,
  };
  if (resultado.titulo) {
    try {
      resultado.categoria = classificar(resultado.titulo, resultado.loja) || null;
    } catch {}
  }
  try {
    resultado.duplicada = await jaNoSite(resultado.loja, r.codigo);
  } catch {}
  return resultado;
}
