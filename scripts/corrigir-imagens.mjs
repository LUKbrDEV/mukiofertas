// Corrige as fotos erradas das ofertas que já estão no site
// (propaganda de encurtador de link, logo da loja, banner de cupom...).
// Salve como scripts/corrigir-imagens.mjs
//
// Primeiro, só para ver o que ele mudaria (não grava nada):
//   node --env-file=.env.local scripts/corrigir-imagens.mjs
// Ver por que cada uma foi mantida:
//   node --env-file=.env.local scripts/corrigir-imagens.mjs --detalhes
// Ver tudo sobre uma oferta específica:
//   node --env-file=.env.local scripts/corrigir-imagens.mjs --busca "Samsung 75"
// Depois, para gravar de verdade:
//   node --env-file=.env.local scripts/corrigir-imagens.mjs --aplicar
// (na VPS, use --env-file=.env.robo)
//
// O que faz em cada oferta no ar (e nas expiradas ainda visíveis):
//   - Amazon: troca pela foto oficial do programa de associados (pelo código do produto)
//   - AliExpress: pega a foto pela API de afiliados (pelo código do produto)
//   - Outras: se a foto tiver cara de logo/banner ou vier de um site que não é de loja, procura a do produto
//   - Se não achar uma foto confiável, deixa sem foto (o card mostra o logo da loja no lugar)

import { createClient } from "@supabase/supabase-js";
import { fotoGenerica, fotoDeConfianca } from "../lib/foto-valida.mjs";
import { imagemDoLink, imagemAmazon } from "../lib/foto-produto.mjs";
import { extrairOferta } from "../lib/extrair-oferta.mjs";

const APLICAR = process.argv.includes("--aplicar");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Servidores de fotos das lojas (foto de produto de verdade)
const CDN_DE_LOJA =
  /(mlstatic\.com|susercontent\.com|shopee|kabum\.com\.br|media-amazon\.com|amazon-adsystem\.com|supabase\.co|netshoes|dafiti|zattini|magazineluiza|mlcdn\.com\.br|vtexassets\.com|vteximg\.com\.br|terabyteshop|pichau|casasbahia|pontofrio|americanas|submarino|carrefour|centauro|renner|cea\.com|riachuelo|hering|lomadee|awin|rakuten)/i;

const asinDe = (t) => String(t ?? "").match(/\/(?:dp|gp\/product|gp\/aw\/d|product)\/([A-Z0-9]{10})(?:[/?#]|$)/i)?.[1]?.toUpperCase() ?? null;
const idAliDe = (o) =>
  String(o.id_externo ?? "").match(/^ali-(\d{6,})$/)?.[1] ??
  decodeURIComponent(String(o.link ?? "")).match(/\/item\/(\d{6,})\.html/)?.[1] ??
  null;

const hostDe = (u) => {
  try {
    return new URL(u).hostname;
  } catch {
    return "";
  }
};

async function fotoCerta(o) {
  const loja = String(o.loja ?? "").toLowerCase();

  if (loja === "amazon") {
    const asin = asinDe(o.link) ?? asinDe(o.id_externo);
    if (asin) return { foto: await imagemAmazon(asin), como: "Amazon (associados)" };
    // link curto (amaznlink, amzn.to...): o imagemDoLink segue até a Amazon
    return { foto: await imagemDoLink(o.link), como: "Amazon (link curto)" };
  }

  if (loja === "aliexpress") {
    const id = idAliDe(o);
    if (id) {
      const r = await extrairOferta(`https://pt.aliexpress.com/item/${id}.html`).catch(() => null);
      if (r?.imagem) return { foto: r.imagem, como: "AliExpress (API)" };
    }
    return { foto: await imagemDoLink(o.link), como: "AliExpress (link)" };
  }

  return { foto: await imagemDoLink(o.link), como: "página do produto" };
}

// Fotos usadas em várias ofertas (preenchido depois de ler o banco)
const titulosPorFoto = new Map();
function fotoRepetida(o) {
  return (titulosPorFoto.get(o.imagem)?.size ?? 0) >= 3;
}

// A foto atual precisa ser revista?
function suspeita(o) {
  const loja = String(o.loja ?? "").toLowerCase();
  if (!o.imagem) return false; // sem foto: não mexe (o card já mostra o logo da loja)
  if (fotoGenerica(o.imagem)) return true;
  if (fotoRepetida(o)) return true;
  // Amazon e AliExpress: a foto antiga pode ser o logo/propaganda mesmo com nome normal
  if (loja === "amazon") return !/media-amazon\.com|amazon-adsystem\.com/.test(hostDe(o.imagem)) && !/supabase\.co/.test(hostDe(o.imagem));
  if (loja === "aliexpress") return !/supabase\.co/.test(hostDe(o.imagem));
  if (fotoDeConfianca(o.imagem)) return false;
  return !CDN_DE_LOJA.test(hostDe(o.imagem));
}

// --busca "texto": só mostra tudo sobre as ofertas com esse texto no título (para diagnóstico)
const iBusca = process.argv.indexOf("--busca");
const BUSCA = iBusca > -1 ? process.argv[iBusca + 1] : null;
if (BUSCA) {
  const { data: achadas, error: e } = await db
    .from("ofertas")
    .select("id, loja, titulo, link, imagem, id_externo, origem, publicada_em, ativa")
    .ilike("titulo", `%${BUSCA}%`)
    .order("publicada_em", { ascending: false })
    .limit(10);
  if (e) console.error(e.message);
  for (const o of achadas ?? []) {
    const repetida = o.imagem
      ? (await db.from("ofertas").select("id", { count: "exact", head: true }).eq("imagem", o.imagem)).count
      : 0;
    console.log(JSON.stringify({ ...o, ofertas_com_a_mesma_foto: repetida, revisaria: suspeita(o) }, null, 2));
  }
  // o que chegou do Telegram para essa oferta (aba Saúde do robô)
  const { data: logs } = await db
    .from("telegram_log")
    .select("criado_em, origem, motivo, loja, link, extras")
    .ilike("titulo", `%${BUSCA}%`)
    .order("criado_em", { ascending: false })
    .limit(5);
  if (logs?.length) console.log("\nRegistro do Telegram:\n" + JSON.stringify(logs, null, 2));
  process.exit(0);
}

// Lê todas as ofertas com foto (o Supabase devolve no máximo 1000 por vez: lê em páginas)
const data = [];
for (let de = 0; ; de += 1000) {
  const { data: pagina, error } = await db
    .from("ofertas")
    .select("id, loja, titulo, link, imagem, id_externo")
    .not("imagem", "is", null)
    .order("publicada_em", { ascending: false })
    .range(de, de + 999);
  if (error) {
    console.error("Erro ao ler as ofertas:", error.message);
    process.exit(1);
  }
  data.push(...pagina);
  if (pagina.length < 1000) break;
}

// A mesma foto em 3+ ofertas de produtos diferentes = logo ou banner, não foto de produto
for (const o of data) {
  if (!titulosPorFoto.has(o.imagem)) titulosPorFoto.set(o.imagem, new Set());
  titulosPorFoto.get(o.imagem).add(String(o.titulo).toLowerCase().slice(0, 40));
}
const revisar = data.filter(suspeita);
console.log(`${data.length} ofertas com foto; ${revisar.length} para revisar.${APLICAR ? "" : " (só mostrando: use --aplicar para gravar)"}\n`);

let trocadas = 0;
let semFoto = 0;
let iguais = 0;
for (const o of revisar) {
  const { foto, como } = await fotoCerta(o).catch(() => ({ foto: null, como: "erro" }));
  if (foto && foto === o.imagem) {
    iguais++;
    if (process.argv.includes("--detalhes")) console.log(`= igual   | ${o.loja} | ${String(o.titulo).slice(0, 60)} [${como}]`);
    continue;
  }
  // AliExpress: se a API não achou nada, mantém a foto atual (pode estar certa)
  if (!foto && String(o.loja).toLowerCase() === "aliexpress" && !fotoGenerica(o.imagem) && !fotoRepetida(o)) {
    iguais++;
    if (process.argv.includes("--detalhes")) console.log(`= manter  | ${o.loja} | ${String(o.titulo).slice(0, 60)} (API não achou outra foto)`);
    continue;
  }
  const nova = foto ?? null;
  console.log(`${nova ? "✓ trocar" : "✗ tirar "} | ${o.loja} | ${String(o.titulo).slice(0, 60)}`);
  console.log(`    antes: ${o.imagem}`);
  console.log(`    depois: ${nova ?? "(sem foto)"}  [${como}]`);
  if (APLICAR) {
    const { error: e } = await db.from("ofertas").update({ imagem: nova }).eq("id", o.id);
    if (e) {
      console.warn(`    erro ao gravar: ${e.message}`);
      continue;
    }
  }
  if (nova) trocadas++;
  else semFoto++;
}

console.log(
  `\nResumo: ${trocadas} fotos ${APLICAR ? "trocadas" : "seriam trocadas"}, ${semFoto} ${APLICAR ? "ficaram" : "ficariam"} sem foto, ${iguais} já estavam certas.`
);
