// Confere o preço das ofertas que NÃO vêm da Lomadee (as do canal do Telegram e as cadastradas
// à mão), lendo a página do produto na loja. Mesma regra da Lomadee (lib/prazos.mjs):
//   - conferência a cada HORAS_ENTRE_CONFERENCIAS horas para cada oferta
//   - subiu mais de TOLERANCIA_PERCENTUAL %: a oferta fica como Expirada
//   - subiu até a tolerância ou caiu: grava o preço novo
//   - perto de expirar com o preço mantido: ganha mais dias (renovação)
//
// A Amazon fica de fora: o contrato do Amazon Associates proíbe ler as páginas de forma automática.
// As ofertas da Amazon continuam expirando só pelo prazo normal.
//
// Salve como scripts/conferir-precos.mjs. Rodar na mão:
//   node --env-file=.env.local scripts/conferir-precos.mjs            (grava no banco)
//   node --env-file=.env.local scripts/conferir-precos.mjs --teste    (só mostra, não grava)
//   node --env-file=.env.local scripts/conferir-precos.mjs --debug    (não grava e mostra o que a loja devolveu)
//   node --env-file=.env.local scripts/conferir-precos.mjs --validar  (não grava: testa até 4 ofertas de cada loja
//                                                                       e mostra uma tabela com o que funcionou)
//
// Shopee e AliExpress são conferidas pela API de afiliados (as páginas delas não mostram o preço
// para robôs). Ofertas com cupom nunca expiram por aqui: a loja mostra o preço SEM o cupom.

import { createClient } from "@supabase/supabase-js";
import { chamarShopee, shopeeConfigurada } from "./fontes/shopee.mjs";
import { chamarAliExpress, aliexpressConfigurado } from "./fontes/aliexpress.mjs";
import {
  DIAS_NO_SITE,
  HORAS_ENTRE_CONFERENCIAS,
  TOLERANCIA_PERCENTUAL,
  precoSubiu,
  horaDeConferir,
  podeRenovar,
  camposDaRenovacao,
  aplicarConfigDoBanco,
  registrarExecucao,
} from "../lib/prazos.mjs";

// ===== AJUSTES =====
const MAX_POR_EXECUCAO = 60; // quantas ofertas conferir por vez (o resto fica para a próxima)
const PAUSA_MS = 1500; // pausa entre uma loja e outra, para não ser bloqueado
// Ofertas com cupom: a loja mostra o preço SEM o cupom, então o preço lido pode ser um pouco maior.
// Até este % acima, a oferta continua (é o desconto do cupom). Passou disso, o preço subiu de
// verdade ou o cupom acabou: a oferta expira. (Antes, com cupom, nunca expirava.)
const TOLERANCIA_COM_CUPOM = 30;
// Lojas que não podem ser conferidas automaticamente
const DOMINIOS_IGNORADOS = [/amazon\./i, /amzn\./i, /amaznlink/i, /\ba\.co\//i];
// ===================

const validar = process.argv.includes("--validar");
const teste = process.argv.includes("--teste") || process.argv.includes("--debug") || validar;
const TEMPO_LIMITE_MS = 15000; // desiste de uma loja que demora mais que isso
const debug = process.argv.includes("--debug"); // mostra o que a loja devolveu (para diagnóstico)
let detalhesDebug = 0;
const NAVEGADOR = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9",
  Accept: "text/html,application/xhtml+xml",
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Leitura do preço na página ----------
function numero(valor) {
  if (valor === null || valor === undefined) return null;
  let t = String(valor).trim().replace(/[^\d.,]/g, "");
  if (!t) return null;
  // "1.299,90" -> 1299.90 | "1299.90" -> 1299.90 | "1299,90" -> 1299.90
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function precoNoJsonLd(html) {
  const blocos = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const bloco of blocos) {
    const texto = bloco.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
    let dados;
    try {
      dados = JSON.parse(texto);
    } catch {
      continue;
    }
    const fila = Array.isArray(dados) ? [...dados] : [dados];
    while (fila.length) {
      const item = fila.shift();
      if (!item || typeof item !== "object") continue;
      if (Array.isArray(item["@graph"])) fila.push(...item["@graph"]);
      const tipo = [].concat(item["@type"] ?? []).join(",");
      if (/Product/i.test(tipo) && item.offers) {
        const ofertas = [].concat(item.offers);
        for (const o of ofertas) {
          const p = numero(o.price ?? o.lowPrice);
          if (p) return p;
        }
      }
    }
  }
  return null;
}

function precoNasMetas(html) {
  const padroes = [
    /<meta[^>]+(?:property|name)=["'](?:product:price:amount|og:price:amount)["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:product:price:amount|og:price:amount)["']/i,
    /itemprop=["']price["'][^>]+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]+itemprop=["']price["']/i,
  ];
  for (const re of padroes) {
    const m = html.match(re);
    const p = m && numero(m[1]);
    if (p) return p;
  }
  return null;
}

// Mercado Livre e outras lojas guardam o preço também em dados dentro da página
function precoEmbutido(html) {
  const padroes = [
    /"price"\s*:\s*\{\s*"type"\s*:\s*"price"\s*,\s*"value"\s*:\s*([\d.]+)/i,
    /"current_price"\s*:\s*\{[^}]*?"value"\s*:\s*([\d.]+)/i,
    /"price"\s*:\s*\{\s*"value"\s*:\s*([\d.]+)/i,
    /"amount"\s*:\s*([\d.]+)\s*,\s*"currency_id"\s*:\s*"BRL"/i,
    /"priceWithDiscount"\s*:\s*([\d.]+)/i, // KaBuM!
    /"sellingPrice"\s*:\s*([\d.]+)/i, // lojas VTEX (Centauro, Netshoes...)
    /"bestPrice"\s*:\s*([\d.]+)/i,
  ];
  for (const re of padroes) {
    const m = html.match(re);
    const p = m && Number(m[1]);
    if (p && p > 0) return p;
  }
  return null;
}

const lerPreco = (html) => precoNoJsonLd(html) ?? precoNasMetas(html) ?? precoEmbutido(html);

function mostrarDebug(rotulo, pagina) {
  if (!debug || detalhesDebug >= 6) return;
  detalhesDebug++;
  const titulo = (pagina.html.match(/<title[^>]*>([^<]*)/i)?.[1] ?? "").trim().slice(0, 90);
  const bloqueio = /captcha|account-verification|suspicious|robot|unusual traffic|security check/i.test(pagina.html);
  const trecho = pagina.html.match(/.{0,60}(?:price|preço|preco).{0,80}/i)?.[0] ?? "(nenhum trecho com 'price')";
  console.log(`      [debug ${rotulo}] status ${pagina.status} | ${pagina.html.length} caracteres | título: "${titulo}"`);
  console.log(`      [debug ${rotulo}] endereço final: ${pagina.url.slice(0, 140)}`);
  console.log(`      [debug ${rotulo}] parece bloqueio/captcha: ${bloqueio ? "SIM" : "não"}`);
  console.log(`      [debug ${rotulo}] trecho: ${trecho.replace(/\s+/g, " ").slice(0, 160)}`);
}

async function abrir(url) {
  const res = await fetch(url, { redirect: "follow", headers: NAVEGADOR, signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
  const html = await res.text();
  return { status: res.status, url: res.url || url, html };
}

const BLOQUEIO = /captcha|account-verification|suspicious|unusual traffic|security check|access denied|are you a robot|não sou um robô/i;

// Só descobre para onde o link curto leva (sem baixar a página)
async function destino(url) {
  try {
    const res = await fetch(url, { redirect: "follow", headers: NAVEGADOR, signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
    const html = await res.text();
    return { url: res.url || url, html };
  } catch {
    return { url, html: "" };
  }
}

// ----- Shopee pela API de afiliados
// O código do produto aparece de vários jeitos, conforme o tipo de link:
//   ...-i.LOJA.PRODUTO   /product/LOJA/PRODUTO   /opaanlp/LOJA/PRODUTO   ?shopid=LOJA&itemid=PRODUTO
//   e às vezes só dentro de outro endereço "escondido" (origin_link=https%3A%2F%2F...)
function idsShopee(texto) {
  let t = String(texto ?? "");
  // desfaz os endereços codificados (%2F → /), até 3 camadas
  for (let i = 0; i < 3; i++) {
    try {
      const d = decodeURIComponent(t);
      if (d === t) break;
      t = d;
    } catch {
      break;
    }
  }
  const padroes = [
    /-i\.(\d{3,})\.(\d{3,})/,
    /\/product\/(\d{3,})\/(\d{3,})/,
    /\/opaanlp\/(\d{3,})\/(\d{3,})/,
    /shop_?id["'=:\s]+(\d{3,})[\s\S]{0,80}?item_?id["'=:\s]+(\d{3,})/i,
  ];
  for (const re of padroes) {
    const m = t.match(re);
    if (m) return { loja: m[1], item: m[2] };
  }
  // item antes da loja (?itemid=...&shopid=...)
  const inv = t.match(/item_?id["'=:\s]+(\d{3,})[\s\S]{0,80}?shop_?id["'=:\s]+(\d{3,})/i);
  return inv ? { loja: inv[2], item: inv[1] } : null;
}

async function precoShopee(link) {
  if (!shopeeConfigurada()) return { erro: "Shopee sem chave da API (SHOPEE_APP_ID/SHOPEE_SECRET)" };
  // primeiro tenta no próprio link (sem abrir nada); depois segue o link curto
  let ids = idsShopee(link);
  let destinoFinal = link;
  if (!ids) {
    const { url, html } = await destino(link);
    destinoFinal = url;
    ids = idsShopee(url) ?? idsShopee(html.slice(0, 60000));
  }
  if (!ids) {
    if (debug) console.log(`      [debug shopee] sem código do produto. Link final: ${destinoFinal.slice(0, 160)}`);
    return { erro: "não achei o código do produto da Shopee no link" };
  }
  const consulta = (filtro) => chamarShopee(`{ productOfferV2(${filtro}, limit: 1) { nodes { priceMin priceMax itemId } } }`);
  let dados = await consulta(`itemId: ${ids.item}, shopId: ${ids.loja}`);
  let no = dados?.productOfferV2?.nodes?.[0];
  // às vezes a loja do link não bate: tenta só pelo código do produto
  if (!no) {
    dados = await consulta(`itemId: ${ids.item}`).catch(() => null);
    no = dados?.productOfferV2?.nodes?.find((n) => String(n.itemId) === String(ids.item)) ?? null;
  }
  const preco = no ? Number(no.priceMin ?? no.priceMax) : null;
  return preco
    ? { preco, via: "API Shopee" }
    : { erro: "a API da Shopee não devolveu o produto (saiu do ar ou não está no programa de afiliados)" };
}

// ----- AliExpress pela API de afiliados (link .../item/CODIGO.html)
async function precoAliExpress(link) {
  if (!aliexpressConfigurado()) return { erro: "AliExpress sem chave da API" };
  const { url, html } = await destino(link);
  const m = `${url} ${html.slice(0, 20000)}`.match(/\/item\/(\d{6,})\.html/) || `${url}`.match(/productIds?=(\d{6,})/);
  if (!m) return { erro: "não achei o código do produto do AliExpress no link" };
  const json = await chamarAliExpress("aliexpress.affiliate.productdetail.get", {
    product_ids: m[1],
    target_currency: "BRL",
    target_language: "PT",
    country: "BR",
    tracking_id: process.env.ALIEXPRESS_TRACKING_ID,
  });
  const resp = json.aliexpress_affiliate_productdetail_get_response?.resp_result;
  const produto = [].concat(resp?.result?.products?.product ?? [])[0];
  const preco = produto ? numero(produto.target_sale_price ?? produto.sale_price) : null;
  return preco ? { preco, via: "API AliExpress" } : { erro: "a API do AliExpress não devolveu o produto" };
}

// Mercado Livre: o link de afiliado (meli.la) abre uma página intermediária;
// o código do anúncio está nela, e com ele abrimos a página do produto.
function codigoML(texto) {
  const doItem = texto.match(/[?&#;](?:item_id|wid)=MLB-?(\d{6,})/i);
  if (doItem) return { tipo: "item", num: doItem[1] };
  const doCatalogo = texto.match(/\/p\/MLB(\d{6,})/i);
  if (doCatalogo) return { tipo: "produto", num: doCatalogo[1] };
  const doAnuncio = texto.match(/MLB-?(\d{8,})/i);
  if (doAnuncio) return { tipo: "item", num: doAnuncio[1] };
  return null;
}

async function precoAtualDaLoja(link, loja = "") {
  const alvo = `${link} ${loja}`;
  if (/shopee/i.test(alvo)) return precoShopee(link);
  if (/aliexpress|s\.click\.ali/i.test(alvo)) return precoAliExpress(link);

  const pagina = await abrir(link);
  if (/shopee\.com/i.test(pagina.url)) return precoShopee(pagina.url);
  if (/aliexpress\.com/i.test(pagina.url)) return precoAliExpress(pagina.url);
  if (pagina.status === 403 || pagina.status === 429 || BLOQUEIO.test(pagina.html.slice(0, 50000)))
    return { erro: `a loja bloqueou a leitura (${pagina.status})`, bloqueado: true };
  if (pagina.status >= 400) return { erro: `a loja respondeu ${pagina.status}` };

  let preco = lerPreco(pagina.html);
  if (!preco) mostrarDebug("link", pagina);

  const ehML = /mercadoli[vb]re|meli\.la/i.test(pagina.url) || /meli\.la/i.test(link);
  if (!preco && ehML) {
    const cod = codigoML(pagina.url) ?? codigoML(pagina.html);
    if (cod) {
      const url =
        cod.tipo === "produto"
          ? `https://www.mercadolivre.com.br/p/MLB${cod.num}`
          : `https://produto.mercadolivre.com.br/MLB-${cod.num}`;
      await esperar(500);
      const produto = await abrir(url);
      if (produto.status === 403 || produto.status === 429 || BLOQUEIO.test(produto.html.slice(0, 50000)))
        return { erro: `o Mercado Livre bloqueou a leitura (${produto.status})`, bloqueado: true };
      if (produto.status >= 400) return { erro: `o Mercado Livre respondeu ${produto.status}` };
      preco = lerPreco(produto.html);
      if (!preco) mostrarDebug("produto", produto);
    }
  }

  return preco ? { preco, via: "página da loja" } : { erro: "preço não encontrado na página" };
}

// ---------- Execução ----------
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Tolerância, intervalo entre conferências, renovação e pausa vêm do painel admin (aba Configurações)
const config = await aplicarConfigDoBanco(supabase);
if (config.conferencia_pausada) {
  console.log("Conferência de preços pausada no painel admin (aba Configurações). Nada foi feito.");
  if (!teste) await registrarExecucao(supabase, "conferir-precos", true, "Pausada no painel admin");
  process.exit(0);
}

const agora = new Date();
const agoraIso = agora.toISOString();
const corte = new Date(agora.getTime() - DIAS_NO_SITE * 86400000).toISOString();

const { data, error } = await supabase
  .from("ofertas")
  .select("id, titulo, loja, link, ativa, oculta_manual, publicada_em, expires_at, preco_atual, preco_antigo, preco_conferido_em, renovacoes, id_externo, cupom")
  .eq("ativa", true)
  .not("id_externo", "like", "lmd-%") // as da Lomadee são conferidas pelo coletar.mjs
  .not("id_externo", "like", "shp-%") // as da Shopee (API) também
  .not("id_externo", "like", "ali-%") // e as do AliExpress (API)
  .not("id_externo", "like", "awn-%") // e as da Awin (KaBuM!), que o feed atualiza
  .not("id_externo", "like", "cp%-%") // cupons da Lomadee/Awin: a coleta atualiza
  .or("categoria.is.null,categoria.neq.cupons") // cupons não têm preço para conferir
  .or(`expires_at.is.null,expires_at.gt.${agoraIso}`)
  .gt("publicada_em", corte)
  .order("preco_conferido_em", { ascending: true, nullsFirst: true })
  .limit(1000);

if (error) {
  console.error("Erro ao buscar ofertas:", error.message);
  if (!teste) await registrarExecucao(supabase, "conferir-precos", false, `Erro: ${error.message}`);
  process.exit(1);
}

const conferiveis = (data ?? []).filter(
  (o) => o.link && !DOMINIOS_IGNORADOS.some((re) => re.test(o.link) || re.test(o.loja ?? ""))
);

// --validar: até 4 ofertas de cada loja, sem esperar a hora da conferência
const porLojaValidar = new Map();
const pendentes = validar
  ? conferiveis.filter((o) => {
      const n = porLojaValidar.get(o.loja) ?? 0;
      if (n >= 4) return false;
      porLojaValidar.set(o.loja, n + 1);
      return true;
    })
  : conferiveis.filter((o) => horaDeConferir(o, agora.getTime())).slice(0, MAX_POR_EXECUCAO);

console.log(
  `\n${pendentes.length} ofertas para conferir agora (a cada ${HORAS_ENTRE_CONFERENCIAS}h, tolerância de ${TOLERANCIA_PERCENTUAL}%).` +
    (teste ? " Modo teste: nada será gravado." : "") +
    "\n"
);

const resumo = { mantidas: 0, baixaram: 0, expiradas: 0, renovadas: 0, semPreco: 0, comCupom: 0 };
const falhasPorLoja = {};
const tabela = {}; // relatório por loja: lidas, sem preço, bloqueadas, maior diferença
const linhaDa = (loja) =>
  (tabela[loja] ??= { conferidas: 0, "preço lido": 0, "sem preço": 0, bloqueada: 0, "maior diferença %": 0, como: "" });

for (const o of pendentes) {
  let resultado;
  try {
    resultado = await precoAtualDaLoja(o.link, o.loja);
  } catch (erro) {
    resultado = { erro: erro.message };
  }

  const atual = Number(o.preco_atual);
  let novo = resultado.preco;

  // Leitura duvidosa (ex.: pegou o valor da parcela): ignora em vez de expirar por engano
  if (novo && (novo < atual * 0.3 || novo > atual * 3)) {
    resultado = { erro: `preço lido (R$ ${novo}) muito diferente do salvo (R$ ${atual}), ignorado` };
    novo = null;
  }

  const campos = { preco_conferido_em: agoraIso };
  let acao;
  const t = linhaDa(o.loja ?? "?");
  t.conferidas++;
  if (novo) {
    t["preço lido"]++;
    t.como = resultado.via ?? t.como;
    t["maior diferença %"] = Math.max(t["maior diferença %"], Math.round(Math.abs((novo - atual) / atual) * 100));
  } else if (resultado.bloqueado) t.bloqueada++;
  else t["sem preço"]++;

  if (!novo) {
    resumo.semPreco++;
    falhasPorLoja[o.loja] = (falhasPorLoja[o.loja] ?? 0) + 1;
    acao = `sem preço (${resultado.erro})`;
  } else if (o.cupom && novo > atual && ((novo - atual) / atual) * 100 <= TOLERANCIA_COM_CUPOM) {
    // Com cupom, a loja mostra o preço antes do desconto do cupom: até a tolerância do cupom, continua
    resumo.comCupom++;
    acao = `mantida (tem cupom ${o.cupom}; a loja mostra R$ ${novo} sem o cupom)`;
  } else if (o.cupom && novo > atual) {
    campos.expires_at = agoraIso;
    resumo.expiradas++;
    acao = `EXPIRADA: com cupom ${o.cupom}, mas subiu de R$ ${atual} para R$ ${novo} (mais de ${TOLERANCIA_COM_CUPOM}%)`;
  } else if (precoSubiu(atual, novo)) {
    campos.expires_at = agoraIso;
    resumo.expiradas++;
    acao = `EXPIRADA: subiu de R$ ${atual} para R$ ${novo}`;
  } else {
    if (novo < atual) {
      campos.preco_atual = novo;
      resumo.baixaram++;
      acao = `baixou de R$ ${atual} para R$ ${novo}`;
    } else {
      resumo.mantidas++;
      acao = `mantida (R$ ${novo})`;
    }
    if (podeRenovar(o, novo, agora.getTime())) {
      Object.assign(campos, camposDaRenovacao(o, agora));
      resumo.renovadas++;
      acao += " + renovada";
    }
  }

  console.log(`  [${o.loja}] ${String(o.titulo).slice(0, 70)} -> ${acao}`);

  if (!teste) {
    const { error: erroGravar } = await supabase.from("ofertas").update(campos).eq("id", o.id);
    if (erroGravar) console.error(`    erro ao gravar: ${erroGravar.message}`);
  }

  await esperar(PAUSA_MS);
}

console.log(
  `\nConferência concluída: ${resumo.mantidas} mantidas, ${resumo.baixaram} com preço menor, ` +
    `${resumo.expiradas} expiradas, ${resumo.renovadas} renovadas, ${resumo.semPreco} sem preço, ` +
    `${resumo.comCupom} com cupom (mantidas).`
);
if (Object.keys(tabela).length) {
  console.log("\nResultado por loja:");
  console.table(tabela);
  if (validar) {
    console.log(
      "Como ler: 'preço lido' alto = a conferência funciona nessa loja. 'bloqueada' = a loja não deixa robôs\n" +
        "lerem a página (comum no Mercado Livre). 'maior diferença %' alta = vale abrir uma oferta e comparar.\n"
    );
  }
}
if (Object.keys(falhasPorLoja).length) {
  console.log("Lojas em que não foi possível ler o preço:", falhasPorLoja);
}
if (!teste) {
  await registrarExecucao(
    supabase,
    "conferir-precos",
    true,
    `${pendentes.length} conferidas: ${resumo.mantidas} mantidas, ${resumo.baixaram} baixaram, ` +
      `${resumo.expiradas} expiradas, ${resumo.renovadas} renovadas, ${resumo.semPreco} sem preço | ` +
      Object.entries(tabela)
        .map(([loja, l]) => `${loja}: ${l["preço lido"]}/${l.conferidas} lidas${l.bloqueada ? `, ${l.bloqueada} bloqueadas` : ""}`)
        .join("; ")
  );
}
console.log("");
