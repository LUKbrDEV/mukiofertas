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
import { descontoMinimoDa, CONFIG_ROBO } from "../../lib/prazos.mjs";
import { precoMinimoPara } from "../../lib/qualidade.mjs";

// ===== AJUSTES =====
// Estes valores podem ser trocados no painel admin (Configurações → AliExpress).
// Os números abaixo valem quando o painel não tiver o valor.
const PADRAO = {
  aliexpress_ativo: true, // false = não busca nada no AliExpress
  aliexpress_preco_minimo: 50, // R$ — só ofertas acima desse preço
  aliexpress_avaliacao_minima: 90, // % de avaliações positivas
  aliexpress_vendas_minimas: 50, // vendas recentes do produto
  aliexpress_por_busca: 20, // produtos pedidos à API em cada busca (máximo da API: 50)
  aliexpress_max_por_execucao: 12, // ofertas do AliExpress por execução
  aliexpress_buscas_tecnologia: 3, // buscas de tecnologia a cada execução
  aliexpress_buscas_outras: 2, // buscas das outras categorias a cada execução
  aliexpress_max_por_busca: 3, // no máximo X ofertas de cada busca
  // "Vem do Brasil": só produtos com entrega rápida para o Brasil (enviados de estoque nacional).
  // A API não tem um filtro "vem do Brasil"; o filtro de prazo de entrega é o que chega mais perto.
  aliexpress_entrega_dias: 7, // só produtos entregues em até X dias (3, 5, 7 ou 10; 0 = qualquer prazo)
  // "Top seller": usa a lista de produtos mais vendidos/em alta do AliExpress em vez da busca comum
  aliexpress_so_mais_vendidos: true,
};
const DESCONTO_MINIMO = 20; // % (tecnologia usa o desconto mínimo de tecnologia do painel)
const MAX_POR_LOJA = 2; // variedade: no máximo X ofertas do mesmo vendedor por execução

// Valor do painel ou o padrão
function ajuste(chave) {
  const v = CONFIG_ROBO?.[chave];
  if (typeof PADRAO[chave] === "boolean") return typeof v === "boolean" ? v : PADRAO[chave];
  return v !== undefined && v !== null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : PADRAO[chave];
}

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
  // Natal: brinquedos e video games
  "blocos de montar", "carrinho controle remoto", "drone infantil", "brinquedo educativo", "pelúcia",
  "console retrô", "r36s", "controle sem fio switch", "action figure", "quebra-cabeça",
];

// Fitness e academia: 2 buscas garantidas em toda execução (rodízio próprio)
const PALAVRAS_FITNESS = [
  "legging fitness", "conjunto fitness", "top fitness", "short fitness", "camiseta dry fit", "regata academia",
  "bermuda compressão", "luva academia", "mini band", "elástico extensor", "corda de pular", "roda abdominal",
  "hand grip", "cinto musculação", "munhequeira", "tapete yoga", "garrafa academia", "smartband",
];
const BUSCAS_FITNESS_POR_EXECUCAO = 2;

// Automotivo (carro e moto): 2 buscas garantidas em toda execução (rodízio próprio)
const PALAVRAS_AUTOMOTIVO = [
  "suporte celular veicular", "carregador veicular", "aspirador automotivo", "compressor de ar portátil",
  "câmera de ré", "central multimídia android", "dash cam", "lâmpada led farol h4", "lâmpada led h7",
  "transmissor fm bluetooth carro", "organizador carro", "luz ambiente carro", "capa volante", "sensor estacionamento",
  "intercomunicador moto", "suporte celular moto", "luva moto", "capa chuva moto", "balaclava moto", "alarme moto",
];
const BUSCAS_AUTOMOTIVO_POR_EXECUCAO = 2;

// Beleza (maquiagem, unhas, cabelos): 2 buscas garantidas em toda execução (rodízio próprio)
const PALAVRAS_BELEZA = [
  "paleta de sombras", "pincel de maquiagem", "esponja de maquiagem", "cílios postiços", "kit maquiagem",
  "batom matte", "gloss labial", "delineador", "esmalte em gel", "kit unha gel", "cabine led unha",
  "kit manicure", "escova secadora", "modelador de cachos", "organizador de maquiagem", "espelho com led",
];
const BUSCAS_BELEZA_POR_EXECUCAO = 2;

// Natal (página /natal): o AliExpress é forte em enfeites e luzes. Rodízio próprio, só na temporada.
const PALAVRAS_NATAL = [
  "árvore de natal", "árvore de natal pequena", "árvore de natal com luz", "árvore de natal nevada",
  "enfeites de natal", "bolas de natal", "ponteira de árvore de natal", "saia de árvore de natal",
  "pisca pisca led", "cortina de luz led", "fio de fada", "luz de natal solar", "projetor de natal",
  "guirlanda de natal", "presépio", "boneco papai noel", "boneco de neve", "enfeite de porta natal",
  "toalha de mesa natal", "almofada natal", "meia de natal", "gorro de natal", "pijama de natal",
];
const BUSCAS_NATAL_POR_EXECUCAO = 2;

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

// Prazos de entrega aceitos pela API (dias)
const PRAZOS_VALIDOS = [3, 5, 7, 10];

async function consultar(metodo, palavra, limite) {
  const dias = ajuste("aliexpress_entrega_dias");
  const prazo = PRAZOS_VALIDOS.find((d) => d >= dias) ?? (dias > 0 ? 10 : undefined);
  const json = await chamarAliExpress(metodo, {
    keywords: palavra,
    page_no: 1,
    page_size: limite,
    sort: "LAST_VOLUME_DESC", // os mais vendidos primeiro
    target_currency: "BRL",
    target_language: "PT",
    ship_to_country: "BR",
    delivery_days: dias > 0 ? prazo : undefined,
    tracking_id: String(process.env.ALIEXPRESS_TRACKING_ID).trim(),
  });

  const chave = metodo === "aliexpress.affiliate.hotproduct.query"
    ? "aliexpress_affiliate_hotproduct_query_response"
    : "aliexpress_affiliate_product_query_response";
  const resp = json[chave]?.resp_result;
  if (!resp) return [];
  // 405 = nenhum produto encontrado para a busca
  if (resp.resp_code && Number(resp.resp_code) !== 200) {
    if (Number(resp.resp_code) === 405) return [];
    throw new Error(`AliExpress: ${resp.resp_msg || "erro"} [${resp.resp_code}]`);
  }
  const produtos = resp.result?.products?.product ?? resp.result?.products ?? [];
  return Array.isArray(produtos) ? produtos : [];
}

let semPermissaoHot = false;

export async function buscarPorPalavra(palavra, limite = ajuste("aliexpress_por_busca")) {
  // Top sellers: lista de produtos em alta; se não vier nada, cai na busca comum (também pelos mais vendidos)
  if (ajuste("aliexpress_so_mais_vendidos") && !semPermissaoHot) {
    try {
      const quentes = await consultar("aliexpress.affiliate.hotproduct.query", palavra, limite);
      if (quentes.length) return quentes;
    } catch (erro) {
      if (/assinatura|App Key/i.test(erro.message)) throw erro;
      // O app não tem acesso à lista de produtos em alta: usa só a busca comum (pelos mais vendidos)
      if (/permiss/i.test(erro.message)) {
        semPermissaoHot = true;
        console.warn("[aliexpress] O app não tem acesso à lista de produtos em alta (hotproduct); usando a busca comum.");
      }
    }
  }
  return consultar("aliexpress.affiliate.product.query", palavra, limite);
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
  if (o.preco_atual <= precoMinimoPara(o, ajuste("aliexpress_preco_minimo"))) return false; // só acima do preço mínimo (beleza aceita mais barato)
  if (Number.isFinite(o._avaliacao) && o._avaliacao > 0 && o._avaliacao < ajuste("aliexpress_avaliacao_minima")) return false;
  if (o._vendas < ajuste("aliexpress_vendas_minimas")) return false;
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

// Natal: só busca na temporada (1º de novembro até a véspera de Natal). Fora dela, a lista fica parada.
const emTemporadaDeNatal = () => {
  const hoje = new Date();
  const m = hoje.getMonth(); // 10 = novembro, 11 = dezembro
  return m === 10 || (m === 11 && hoje.getDate() <= 24);
};

function rodizio(lista, quantas) {
  if (!(quantas > 0)) return [];
  const blocos = Math.max(1, Math.ceil(lista.length / quantas));
  const vez = Math.floor(Date.now() / (30 * 60 * 1000)) % blocos; // muda a cada 30 min
  return lista.slice(vez * quantas, (vez + 1) * quantas);
}

function palavrasDaVez() {
  return [
    ...rodizio(PALAVRAS_TECNOLOGIA, ajuste("aliexpress_buscas_tecnologia")),
    ...rodizio(PALAVRAS_OUTRAS, ajuste("aliexpress_buscas_outras")),
    ...rodizio(PALAVRAS_FITNESS, BUSCAS_FITNESS_POR_EXECUCAO),
    ...rodizio(PALAVRAS_AUTOMOTIVO, BUSCAS_AUTOMOTIVO_POR_EXECUCAO),
    ...rodizio(PALAVRAS_BELEZA, BUSCAS_BELEZA_POR_EXECUCAO),
    ...(emTemporadaDeNatal() ? rodizio(PALAVRAS_NATAL, BUSCAS_NATAL_POR_EXECUCAO) : []),
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
  if (!ajuste("aliexpress_ativo")) {
    console.log("[aliexpress] Desligado no painel admin (Configurações → AliExpress): pulando.");
    return [];
  }
  const MAX_POR_EXECUCAO = ajuste("aliexpress_max_por_execucao");
  const MAX_POR_PALAVRA = ajuste("aliexpress_max_por_busca");
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
      // avaliação positiva do AliExpress (ex.: 96,5%) vira nota de 0 a 5 (4,8), como nas outras lojas
      nota: _avaliacao ? Math.round((_avaliacao / 20) * 10) / 10 : null,
      vendas: _vendas || null,
      // mantém o link e a data original das ofertas que já estavam no site
      link: existente?.link || o.link,
      publicada_em: existente?.publicada_em ?? agora,
    };
  });

  console.log(`[aliexpress] ${itens.length} ofertas prontas.`);
  return itens;
}
