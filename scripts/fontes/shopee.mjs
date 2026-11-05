// Fonte de ofertas: Shopee (API de Afiliados da Shopee, GraphQL)
// Salve como scripts/fontes/shopee.mjs. Usada pelo scripts/coletar.mjs.
//
// O que faz:
//   1) procura produtos na Shopee por palavras-chave (as categorias do site), os mais vendidos primeiro
//   2) fica só com os que têm desconto de verdade, boa nota e vendas
//   3) usa o seu link de afiliado que a própria API devolve (offerLink)
//
// Variáveis (no .env.local e nos Secrets do GitHub):
//   SHOPEE_APP_ID    AppID da Open API (painel de afiliados da Shopee → Open API)
//   SHOPEE_SECRET    Senha/Secret da Open API
//   SHOPEE_API_URL   (opcional) endereço da API. Padrão: https://open-api.affiliate.shopee.com.br/graphql
//
// Para testar sem gravar nada no banco:
//   node --env-file=.env.local scripts/testar-shopee.mjs

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { classificar } from "../../lib/classificar.mjs";
import { descontoMinimoDa, CONFIG_ROBO } from "../../lib/prazos.mjs";
import { regrasDeQualidade } from "../../lib/qualidade.mjs";

// ===== AJUSTES =====
const DESCONTO_MINIMO = 20; // % de desconto mínimo (o coletar também filtra pelo valor do painel)
// Preço mínimo, desconto máximo, nota, vendas e quantidade por execução vêm do painel admin
// (Configurações → Shopee e AliExpress), com os padrões do lib/qualidade.mjs
const regras = () => regrasDeQualidade(CONFIG_ROBO);
const POR_BUSCA = 50; // produtos por palavra-chave (máximo da API: 50)

const MAX_POR_VENDEDOR = 2; // variedade: no máximo X ofertas do mesmo vendedor por execução

// Palavras-chave procuradas a cada execução (um rodízio pega uma parte por vez,
// para não fazer muitas chamadas de uma vez). Acrescente ou tire à vontade.
// Palavras-chave em duas listas. A cada execução o robô pega algumas de cada uma (rodízio),
// com mais buscas de tecnologia, porque são as ofertas que o site mais precisa.
const PALAVRAS_TECNOLOGIA = [
  "smart tv", "smart tv 4k", "tv 50 polegadas", "tv 55 polegadas", "monitor gamer", "monitor 27", "monitor 24",
  "monitor 144hz", "notebook", "notebook gamer", "notebook i5", "notebook ryzen", "tablet", "celular samsung",
  "celular motorola", "xiaomi redmi", "iphone", "ssd nvme", "ssd 1tb", "memória ram ddr4", "memória ram ddr5",
  "placa de vídeo", "rtx", "processador ryzen", "processador intel", "placa mãe", "gabinete gamer",
  "fonte atx", "water cooler", "pc gamer",
];
const PALAVRAS_OUTRAS = [
  "fone bluetooth", "teclado mecânico", "mouse gamer", "headset gamer", "smartwatch", "caixa de som bluetooth",
  "air fryer", "aspirador robô", "cafeteira", "liquidificador", "panela elétrica",
  "perfume importado", "kit skincare", "secador de cabelo", "chapinha", "barbeador elétrico",
  "tênis masculino", "tênis feminino", "mochila notebook", "mala de viagem", "relógio masculino",
  "carregador turbo", "power bank", "câmera de segurança wifi", "roteador wifi", "lâmpada inteligente",
  "furadeira parafusadeira", "jogo de ferramentas", "garrafa térmica", "jogo de panelas", "jogo de cama",
  "cadeira gamer", "suporte monitor", "controle ps5", "controle xbox",
  // Eletrodomésticos (alta procura na Black Friday)
  "geladeira frost free", "máquina de lavar", "lava e seca", "micro-ondas", "air fryer 5l", "fogão 4 bocas",
  "cooktop indução", "ventilador", "aspirador vertical", "batedeira planetária", "cafeteira expresso", "freezer",
  // Natal: brinquedos e video games
  "lego", "boneca", "carrinho controle remoto", "pista hot wheels", "nerf", "pelúcia", "jogo de tabuleiro",
  "blocos de montar", "bicicleta infantil", "playstation 5", "nintendo switch", "xbox series", "console retrô",
  // Bebês
  "carrinho de bebê", "bebê conforto", "cadeirinha para carro", "berço", "babá eletrônica", "mamadeira",
  "cadeira de alimentação", "fralda pampers", "fralda huggies", "lenço umedecido", "banheira bebê", "velotrol",
];
const BUSCAS_TECNOLOGIA_POR_EXECUCAO = 6; // buscas de tecnologia a cada execução
const BUSCAS_OUTRAS_POR_EXECUCAO = 5; // buscas das outras categorias a cada execução
const MAX_POR_PALAVRA = 5; // no máximo X ofertas de cada busca (para uma busca não ocupar tudo)

// Vendedores que você NÃO quer no site (nome da loja na Shopee). Ex.: ["Loja X"]
const VENDEDORES_BLOQUEADOS = [];
// Palavras no título que fazem a oferta ser ignorada
const PALAVRAS_BLOQUEADAS = [/r[eé]plica/i, /\bfake\b/i];
// ===================

const API = process.env.SHOPEE_API_URL || "https://open-api.affiliate.shopee.com.br/graphql";
const PREFIXO_ID = "shp-";
const INTERVALO_MS = 1200;

let ultimaChamada = 0;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export function shopeeConfigurada() {
  return Boolean(process.env.SHOPEE_APP_ID && process.env.SHOPEE_SECRET);
}

// Chamada à API com a assinatura exigida pela Shopee:
// Authorization: SHA256 Credential=AppID, Timestamp=..., Signature=sha256(AppID + Timestamp + corpo + Secret)
export async function chamarShopee(query, tentativa = 1) {
  const espera = ultimaChamada + INTERVALO_MS - Date.now();
  if (espera > 0) await esperar(espera);
  ultimaChamada = Date.now();

  const appId = String(process.env.SHOPEE_APP_ID).trim();
  const secret = String(process.env.SHOPEE_SECRET).trim();
  const corpo = JSON.stringify({ query });
  const timestamp = Math.floor(Date.now() / 1000);
  const assinatura = createHash("sha256").update(`${appId}${timestamp}${corpo}${secret}`).digest("hex");

  const resposta = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${assinatura}`,
    },
    body: corpo,
  });

  const texto = await resposta.text();
  let json;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new Error(`Resposta inesperada da Shopee (${resposta.status}): ${texto.slice(0, 200)}`);
  }

  if (json.errors?.length) {
    const e = json.errors[0];
    const codigo = e.extensions?.code;
    // 10030 = muitas chamadas: espera e tenta de novo
    if (codigo === 10030 && tentativa < 3) {
      await esperar(5000 * tentativa);
      return chamarShopee(query, tentativa + 1);
    }
    const dicas = {
      10020: " (assinatura inválida: confira SHOPEE_APP_ID e SHOPEE_SECRET, sem espaços)",
      10031: " (sem permissão: o acesso à Open API foi aprovado?)",
      10032: " (AppID inválido)",
      10033: " (conta de afiliado bloqueada ou sem acesso)",
    };
    throw new Error(`Shopee: ${e.message}${codigo ? ` [${codigo}]` : ""}${dicas[codigo] ?? ""}`);
  }
  return json.data;
}

const aspas = (texto) => JSON.stringify(String(texto)); // texto seguro dentro da query

export async function buscarPorPalavra(palavra, limite = POR_BUSCA) {
  const data = await chamarShopee(`{
    productOfferV2(keyword: ${aspas(palavra)}, sortType: 2, page: 1, limit: ${limite}) {
      nodes {
        itemId productName priceMin priceMax priceDiscountRate imageUrl
        offerLink productLink shopName shopId ratingStar sales commissionRate
      }
      pageInfo { page limit hasNextPage }
    }
  }`);
  return data?.productOfferV2?.nodes ?? [];
}

// Transforma um produto da API no formato do site (ou null se não servir)
export function converter(p) {
  const atual = Number(p.priceMin ?? p.priceMax);
  const desconto = Number(p.priceDiscountRate ?? 0); // a Shopee manda em % (ex.: 35 = 35%)
  if (!atual || !(desconto > 0) || desconto >= 95) return null;

  // A API não manda o preço "de"; ele é calculado pelo desconto que a Shopee mostra no anúncio
  const antigo = Math.round((atual / (1 - desconto / 100)) * 100) / 100;

  return {
    loja: "Shopee",
    id_externo: `${PREFIXO_ID}${p.itemId}`,
    titulo: String(p.productName ?? "").replace(/\s+/g, " ").trim().slice(0, 200),
    preco_atual: Math.round(atual * 100) / 100,
    preco_antigo: antigo,
    link: p.offerLink || p.productLink,
    imagem: p.imageUrl || null,
    // informações só para o filtro (não vão para o banco)
    _desconto: desconto,
    _nota: Number(p.ratingStar ?? 0),
    _vendas: Number(p.sales ?? 0),
    _vendedor: p.shopName ?? "",
  };
}

function passaNosFiltros(o) {
  if (!o || !o.link || !o.titulo) return false;
  // tecnologia aceita desconto menor (TV, monitor, notebook, celular, hardware)
  if (o._desconto < Math.min(DESCONTO_MINIMO, descontoMinimoDa(classificar(o.titulo, o.loja)))) return false;
  const r = regras();
  if (o.preco_atual < r.mkt_preco_minimo) return false;
  if (o._desconto > r.mkt_desconto_maximo) return false; // preço "de" inflado
  if (!o._nota || o._nota < r.shopee_nota_minima) return false; // sem nota = sem avaliação: fora
  if (o._vendas < r.shopee_vendas_minimas) return false;
  if (VENDEDORES_BLOQUEADOS.some((v) => v.toLowerCase() === o._vendedor.toLowerCase())) return false;
  if (PALAVRAS_BLOQUEADAS.some((re) => re.test(o.titulo))) return false;
  return true;
}

// Mesmo modelo em outra cor/tamanho conta como repetido
function chaveDoModelo(titulo) {
  return String(titulo)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(preto|preta|branco|branca|azul|rosa|vermelho|vermelha|verde|cinza|bege|roxo|amarelo|dourado|prata)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 7)
    .join(" ");
}

// Palavras desta execução (rodízio pela hora do dia)
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
      .select("id_externo, publicada_em")
      .eq("loja", "Shopee")
      .in("id_externo", ids.slice(i, i + 200));
    for (const o of data ?? []) mapa.set(o.id_externo, o);
  }
  return mapa;
}

// ---------- Função usada pelo coletar.mjs ----------
export async function buscar({ palavras } = {}) {
  if (!shopeeConfigurada()) {
    console.log("[shopee] SHOPEE_APP_ID e SHOPEE_SECRET não configurados: pulando a Shopee.");
    return [];
  }

  const lista = palavras ?? palavrasDaVez();
  console.log(`[shopee] Buscando: ${lista.join(", ")}`);

  const porPalavra = [];
  for (const palavra of lista) {
    try {
      const produtos = await buscarPorPalavra(palavra);
      const bons = produtos.map(converter).filter(passaNosFiltros);
      console.log(`[shopee] "${palavra}": ${produtos.length} produtos, ${bons.length} aprovados nos filtros`);
      // Mais vendidos e mais bem avaliados primeiro (antes era o maior desconto, que puxava os inflados)
      porPalavra.push(bons.sort((x, y) => y._vendas - x._vendas || y._nota - x._nota || y._desconto - x._desconto));
    } catch (erro) {
      // erro de chave/assinatura vale para todas as buscas: para logo
      if (/\[100(20|31|32|33)\]/.test(erro.message)) throw erro;
      console.warn(`[shopee] Falha em "${palavra}": ${erro.message}`);
    }
  }

  // Sem repetidos, maiores descontos primeiro, no máximo X por vendedor
  const ids = new Set();
  const modelos = new Set();
  const porVendedor = new Map();
  // Pega as melhores de cada busca, uma de cada vez (assim todas as buscas aparecem),
  // sem repetir produto/modelo e respeitando o limite por vendedor
  const candidatos = [];
  const usadosPorPalavra = porPalavra.map(() => 0);
  for (let rodada = 0; rodada < 50 && candidatos.length < regras().shopee_max_por_execucao; rodada++) {
    let pegouAlgum = false;
    porPalavra.forEach((lista, i) => {
      while (lista.length && usadosPorPalavra[i] < MAX_POR_PALAVRA && candidatos.length < regras().shopee_max_por_execucao) {
        const o = lista.shift();
        const modelo = chaveDoModelo(o.titulo);
        const n = porVendedor.get(o._vendedor) ?? 0;
        if (ids.has(o.id_externo) || modelos.has(modelo) || (n >= MAX_POR_VENDEDOR)) continue;
        ids.add(o.id_externo);
        modelos.add(modelo);
        porVendedor.set(o._vendedor, n + 1);
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

  const itens = candidatos.map(({ _desconto, _nota, _vendas, _vendedor, ...o }) => ({
    ...o,
    // nota (0 a 5 estrelas) e vendas da Shopee: usadas na faixa "Mais bem avaliadas"
    nota: _nota ? Math.round(_nota * 10) / 10 : null,
    vendas: _vendas || null,
    // mantém a data original das ofertas que já estavam no site
    publicada_em: existentes.get(o.id_externo)?.publicada_em ?? agora,
  }));

  console.log(`[shopee] ${itens.length} ofertas prontas.`);
  return itens;
}
