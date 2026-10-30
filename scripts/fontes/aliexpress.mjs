// Fonte de ofertas: AliExpress (API de Afiliados do AliExpress Open Platform)
// Salve como scripts/fontes/aliexpress.mjs. Usada pelo scripts/coletar.mjs.
//
// O que faz:
//   1) procura produtos no AliExpress por palavras-chave, os mais vendidos primeiro,
//      com preço em reais e entrega para o Brasil
//   2) fica só com os que têm desconto de verdade, boa avaliação e vendas
//   3) usa o seu link de afiliado (promotion_link), que a API já devolve com o seu Tracking ID
//
// Variáveis (no .env.local e nos Secrets do GitHub):
//   ALIEXPRESS_APP_KEY      App Key do app no AliExpress Open Platform
//   ALIEXPRESS_APP_SECRET   App Secret do mesmo app
//   ALIEXPRESS_TRACKING_ID  seu Tracking ID de afiliado
//
// Para testar sem gravar nada no banco:
//   node --env-file=.env.local scripts/testar-aliexpress.mjs

import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { classificar } from "../../lib/classificar.mjs";
import { descontoMinimoDa } from "../../lib/prazos.mjs";

// ===== AJUSTES =====
const DESCONTO_MINIMO = 20; // % de desconto mínimo (o coletar também filtra pelo valor do painel)
const PRECO_MINIMO = 15; // R$ — abaixo disso é ignorado (muita bugiganga)
const AVALIACAO_MINIMA = 90; // % de avaliações positivas
const VENDAS_MINIMAS = 50; // vendas recentes do produto
const POR_BUSCA = 50; // produtos por palavra-chave (máximo da API: 50)
const MAX_POR_EXECUCAO = 30; // ofertas do AliExpress por execução
const MAX_POR_LOJA = 2; // variedade: no máximo X ofertas do mesmo vendedor por execução

// Palavras-chave (um rodízio pega uma parte por vez, para não fazer muitas chamadas de uma vez)
// Palavras-chave em duas listas. A cada execução o robô pega algumas de cada uma (rodízio),
// com mais buscas de tecnologia, porque são as ofertas que o site mais precisa.
const PALAVRAS_TECNOLOGIA = [
  "monitor gamer", "monitor portátil", "monitor 27", "smart tv", "tv box", "notebook", "mini pc", "tablet",
  "celular xiaomi", "xiaomi redmi", "poco", "ssd nvme", "ssd 1tb", "ssd 2tb", "memória ram ddr4",
  "memória ram ddr5", "placa de vídeo", "processador ryzen", "processador intel", "placa mãe",
  "gabinete gamer", "fonte atx", "water cooler", "cooler processador",
];
const PALAVRAS_OUTRAS = [
  "fone bluetooth", "smartwatch", "teclado mecânico", "mouse gamer", "headset gamer",
  "carregador gan", "power bank", "cabo usb c", "hub usb c", "caixa de som bluetooth",
  "câmera de segurança wifi", "lâmpada inteligente", "tomada inteligente", "roteador wifi 6", "projetor",
  "drone", "action cam", "microfone condensador", "ring light", "controle bluetooth",
  "aspirador portátil", "organizador", "ferramenta multifuncional", "parafusadeira",
  "relógio masculino", "mochila notebook", "óculos de sol", "kit maquiagem",
  "suporte celular carro", "luminária led", "fita led", "lanterna tática",
];
const BUSCAS_TECNOLOGIA_POR_EXECUCAO = 5; // buscas de tecnologia a cada execução
const BUSCAS_OUTRAS_POR_EXECUCAO = 3; // buscas das outras categorias a cada execução
const MAX_POR_PALAVRA = 5; // no máximo X ofertas de cada busca (para uma busca não ocupar tudo)

// Palavras no título que fazem a oferta ser ignorada
const PALAVRAS_BLOQUEADAS = [/r[eé]plica/i, /\bfake\b/i];
// ===================

const API = "https://api-sg.aliexpress.com/sync";
const PREFIXO_ID = "ali-";
const INTERVALO_MS = 1200;

let ultimaChamada = 0;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export function aliexpressConfigurado() {
  return Boolean(
    process.env.ALIEXPRESS_APP_KEY && process.env.ALIEXPRESS_APP_SECRET && process.env.ALIEXPRESS_TRACKING_ID
  );
}

// Assinatura do AliExpress Open Platform (sign_method = sha256):
// ordena os parâmetros pelo nome, junta nome+valor de todos e calcula HMAC-SHA256 com o App Secret (em maiúsculas)
function assinar(parametros, segredo) {
  const texto = Object.keys(parametros)
    .sort()
    .map((k) => `${k}${parametros[k]}`)
    .join("");
  return createHmac("sha256", segredo).update(texto, "utf8").digest("hex").toUpperCase();
}

export async function chamarAliExpress(metodo, extras = {}, tentativa = 1) {
  const espera = ultimaChamada + INTERVALO_MS - Date.now();
  if (espera > 0) await esperar(espera);
  ultimaChamada = Date.now();

  const parametros = {
    app_key: String(process.env.ALIEXPRESS_APP_KEY).trim(),
    method: metodo,
    timestamp: String(Date.now()),
    sign_method: "sha256",
    ...Object.fromEntries(Object.entries(extras).filter(([, v]) => v !== undefined && v !== null && v !== "")),
  };
  parametros.sign = assinar(parametros, String(process.env.ALIEXPRESS_APP_SECRET).trim());

  const resposta = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams(parametros).toString(),
  });
  const texto = await resposta.text();
  let json;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new Error(`Resposta inesperada do AliExpress (${resposta.status}): ${texto.slice(0, 200)}`);
  }

  if (json.error_response) {
    const e = json.error_response;
    // limite de chamadas: espera e tenta de novo
    if (/limit|frequency|throttl/i.test(`${e.code} ${e.msg} ${e.sub_code}`) && tentativa < 3) {
      await esperar(5000 * tentativa);
      return chamarAliExpress(metodo, extras, tentativa + 1);
    }
    const dica = /IncompleteSignature|InvalidSignature|sign/i.test(`${e.code} ${e.msg}`)
      ? " (assinatura inválida: confira ALIEXPRESS_APP_KEY e ALIEXPRESS_APP_SECRET, sem espaços)"
      : /AppKey|app_key|InvalidApp/i.test(`${e.code} ${e.msg}`)
        ? " (App Key inválida ou app ainda não aprovado)"
        : /permission|InsufficientPermission|api.*access/i.test(`${e.code} ${e.msg}`)
          ? " (o app não tem permissão para a API de afiliados: confira no Open Platform)"
          : "";
    throw new Error(`AliExpress: ${e.msg || e.code}${e.sub_code ? ` [${e.sub_code}]` : ""}${dica}`);
  }
  return json;
}

export async function buscarPorPalavra(palavra, limite = POR_BUSCA) {
  const json = await chamarAliExpress("aliexpress.affiliate.product.query", {
    keywords: palavra,
    page_no: 1,
    page_size: limite,
    sort: "LAST_VOLUME_DESC",
    target_currency: "BRL",
    target_language: "PT",
    ship_to_country: "BR",
    tracking_id: String(process.env.ALIEXPRESS_TRACKING_ID).trim(),
  });

  const resp = json.aliexpress_affiliate_product_query_response?.resp_result;
  if (!resp) return [];
  // 405 = nenhum produto encontrado para a busca
  if (resp.resp_code && Number(resp.resp_code) !== 200) {
    if (Number(resp.resp_code) === 405) return [];
    throw new Error(`AliExpress: ${resp.resp_msg || "erro"} [${resp.resp_code}]`);
  }
  const produtos = resp.result?.products?.product ?? resp.result?.products ?? [];
  return Array.isArray(produtos) ? produtos : [];
}

const numero = (v) => {
  if (v === null || v === undefined || v === "") return NaN;
  const t = String(v).replace(/[^\d.,-]/g, "");
  // "1.299,90" (formato brasileiro) ou "1299.90"
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
};

// Transforma um produto da API no formato do site (ou null se não servir)
export function converter(p) {
  const atual = numero(p.target_sale_price ?? p.sale_price);
  let antigo = numero(p.target_original_price ?? p.original_price);
  const descontoInformado = numero(p.discount); // "35%"
  if (!(atual > 0)) return null;

  // Sem preço original: calcula pelo desconto informado
  if (!(antigo > atual) && descontoInformado > 0 && descontoInformado < 95) {
    antigo = atual / (1 - descontoInformado / 100);
  }
  if (!(antigo > atual)) return null;
  antigo = Math.round(antigo * 100) / 100;

  const desconto = Math.round(((antigo - atual) / antigo) * 100);
  const link = p.promotion_link || null;

  return {
    loja: "AliExpress",
    id_externo: `${PREFIXO_ID}${p.product_id}`,
    titulo: String(p.product_title ?? "").replace(/\s+/g, " ").trim().slice(0, 200),
    preco_atual: Math.round(atual * 100) / 100,
    preco_antigo: antigo,
    link,
    imagem: p.product_main_image_url || null,
    // informações só para o filtro (não vão para o banco)
    _desconto: desconto,
    _avaliacao: numero(p.evaluate_rate), // "96.5%"
    _vendas: numero(p.lastest_volume ?? p.latest_volume) || 0,
    _vendedor: String(p.shop_id ?? p.shop_url ?? ""),
  };
}

function passaNosFiltros(o) {
  if (!o || !o.link || !o.titulo) return false;
  if (o._desconto >= 95) return false;
  // tecnologia aceita desconto menor (TV, monitor, notebook, celular, hardware)
  if (o._desconto < Math.min(DESCONTO_MINIMO, descontoMinimoDa(classificar(o.titulo, o.loja)))) return false;
  if (o.preco_atual < PRECO_MINIMO) return false;
  if (Number.isFinite(o._avaliacao) && o._avaliacao > 0 && o._avaliacao < AVALIACAO_MINIMA) return false;
  if (o._vendas < VENDAS_MINIMAS) return false;
  if (PALAVRAS_BLOQUEADAS.some((re) => re.test(o.titulo))) return false;
  return true;
}

function chaveDoModelo(titulo) {
  return String(titulo)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 7)
    .join(" ");
}

function rodizio(lista, quantas) {
  const blocos = Math.max(1, Math.ceil(lista.length / quantas));
  const vez = Math.floor(Date.now() / (30 * 60 * 1000)) % blocos; // muda a cada 30 min
  return lista.slice(vez * quantas, (vez + 1) * quantas);
}

function palavrasDaVez() {
  return [
    ...rodizio(PALAVRAS_TECNOLOGIA, BUSCAS_TECNOLOGIA_POR_EXECUCAO),
    ...rodizio(PALAVRAS_OUTRAS, BUSCAS_OUTRAS_POR_EXECUCAO),
  ];
}

async function buscarExistentes(ids) {
  const mapa = new Map();
  if (!ids.length || !process.env.SUPABASE_SERVICE_ROLE_KEY) return mapa;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db
      .from("ofertas")
      .select("id_externo, publicada_em, link")
      .eq("loja", "AliExpress")
      .in("id_externo", ids.slice(i, i + 200));
    for (const o of data ?? []) mapa.set(o.id_externo, o);
  }
  return mapa;
}

// ---------- Função usada pelo coletar.mjs ----------
export async function buscar({ palavras } = {}) {
  if (!aliexpressConfigurado()) {
    console.log("[aliexpress] ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET ou ALIEXPRESS_TRACKING_ID não configurados: pulando.");
    return [];
  }

  const lista = palavras ?? palavrasDaVez();
  console.log(`[aliexpress] Buscando: ${lista.join(", ")}`);

  const porPalavra = [];
  for (const palavra of lista) {
    try {
      const produtos = await buscarPorPalavra(palavra);
      const bons = produtos.map(converter).filter(passaNosFiltros);
      console.log(`[aliexpress] "${palavra}": ${produtos.length} produtos, ${bons.length} aprovados nos filtros`);
      porPalavra.push(bons.sort((x, y) => y._desconto - x._desconto || y._vendas - x._vendas));
    } catch (erro) {
      // erro de chave/assinatura/permissão vale para todas as buscas: para logo
      if (/assinatura|App Key|permissão/i.test(erro.message)) throw erro;
      console.warn(`[aliexpress] Falha em "${palavra}": ${erro.message}`);
    }
  }

  const ids = new Set();
  const modelos = new Set();
  const porLoja = new Map();
  // Pega as melhores de cada busca, uma de cada vez (assim todas as buscas aparecem),
  // sem repetir produto/modelo e respeitando o limite por vendedor
  const candidatos = [];
  const usadosPorPalavra = porPalavra.map(() => 0);
  for (let rodada = 0; rodada < 50 && candidatos.length < MAX_POR_EXECUCAO; rodada++) {
    let pegouAlgum = false;
    porPalavra.forEach((lista, i) => {
      while (lista.length && usadosPorPalavra[i] < MAX_POR_PALAVRA && candidatos.length < MAX_POR_EXECUCAO) {
        const o = lista.shift();
        const modelo = chaveDoModelo(o.titulo);
        const n = porLoja.get(o._vendedor) ?? 0;
        if (ids.has(o.id_externo) || modelos.has(modelo) || (o._vendedor && n >= MAX_POR_LOJA)) continue;
        ids.add(o.id_externo);
        modelos.add(modelo);
        porLoja.set(o._vendedor, n + 1);
        candidatos.push(o);
        usadosPorPalavra[i]++;
        pegouAlgum = true;
        break;
      }
    });
    if (!pegouAlgum) break;
  }

  const existentes = await buscarExistentes(candidatos.map((c) => c.id_externo));
  const agora = new Date().toISOString();

  const itens = candidatos.map(({ _desconto, _avaliacao, _vendas, _vendedor, ...o }) => {
    const existente = existentes.get(o.id_externo);
    return {
      ...o,
      // mantém o link e a data original das ofertas que já estavam no site
      link: existente?.link || o.link,
      publicada_em: existente?.publicada_em ?? agora,
    };
  });

  console.log(`[aliexpress] ${itens.length} ofertas prontas.`);
  return itens;
}
