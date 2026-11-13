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
import { regrasDeQualidade, precoMinimoPara } from "../../lib/qualidade.mjs";

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
  // Natal: brinquedos e video games
  "lego", "boneca", "carrinho controle remoto", "pista hot wheels", "nerf", "pelúcia", "jogo de tabuleiro",
  "blocos de montar", "bicicleta infantil", "playstation 5", "nintendo switch", "xbox series", "console retrô",
  // Bebês
  "carrinho de bebê", "bebê conforto", "cadeirinha para carro", "berço", "babá eletrônica", "mamadeira",
  "cadeira de alimentação", "fralda pampers", "fralda huggies", "lenço umedecido", "banheira bebê", "velotrol",
];
// PRIORIDADE: eletrodomésticos, climatização, exaustores e eletrônicos para casa (o que mais vende).
// Lista própria, com mais buscas por execução e buscada ANTES das outras (pega as vagas primeiro).
const PALAVRAS_CASA = [
  // climatização
  "ar condicionado split", "ar condicionado inverter", "ar condicionado portátil", "climatizador de ar",
  "ventilador de coluna", "ventilador de teto", "circulador de ar", "aquecedor elétrico", "umidificador de ar",
  "purificador de ar", "desumidificador",
  // cozinha
  "exaustor de cozinha", "coifa", "depurador de ar", "cooktop indução", "cooktop 5 bocas", "fogão 4 bocas",
  "forno elétrico", "micro-ondas", "air fryer", "air fryer forno", "geladeira frost free", "freezer", "frigobar",
  "lava louças", "purificador de água", "bebedouro", "panela elétrica", "cafeteira expresso",
  "batedeira planetária", "liquidificador", "processador de alimentos", "sanduicheira", "chaleira elétrica",
  // lavanderia e limpeza
  "máquina de lavar", "lava e seca", "tanquinho", "secadora de roupas", "aspirador vertical", "aspirador robô",
  "lavadora de alta pressão", "ferro de passar a vapor", "vaporizador de roupas",
  // eletrônicos para casa
  "smart tv 50", "smart tv 43", "soundbar", "home theater", "fire tv stick", "tv box", "alexa echo",
  "câmera de segurança wifi", "fechadura digital", "lâmpada inteligente", "tomada inteligente", "videoporteiro",
];
const BUSCAS_CASA_POR_EXECUCAO = 7; // buscas de casa/eletro a cada execução (as que mais vendem)
// Saúde e Beleza, Esporte, Mercado, Pet, Livros, Ferramentas e Automotivo: lista própria,
// com buscas garantidas em toda execução (assim não perdem o rodízio para tecnologia)
const PALAVRAS_NICHOS = [
  "whey protein", "creatina", "perfume importado", "kit maquiagem", "protetor solar facial", "secador de cabelo",
  "barbeador elétrico", "escova de dente elétrica", "medidor de pressão", "colágeno",
  "halter", "kettlebell", "bicicleta aro 29", "barraca camping", "bola de futebol", "patinete elétrico", "caixa térmica",
  "ração golden", "ração premier", "areia para gato", "tapete higiênico", "cama para cachorro", "arranhador gato",
  "café em grãos", "cápsula dolce gusto", "kit cerveja", "chocolate lacta", "azeite extra virgem",
  "kindle", "box de livros", "mangá", "calculadora científica",
  "furadeira parafusadeira", "kit ferramentas", "lavadora de alta pressão", "esmerilhadeira", "cortador de grama",
  "central multimídia", "câmera de ré", "aspirador automotivo", "compressor de ar portátil", "capacete moto",
];
// Fitness e academia: lista própria, com buscas garantidas em toda execução
const PALAVRAS_FITNESS = [
  "legging fitness", "conjunto fitness feminino", "top fitness", "short fitness feminino", "macaquinho fitness",
  "camiseta dry fit masculina", "regata academia masculina", "bermuda de compressão", "calça legging cintura alta",
  "jaqueta corta vento esportiva", "meia de compressão esportiva", "top nadador fitness",
  "whey protein concentrado", "creatina monohidratada", "pré treino", "pasta de amendoim integral", "coqueteleira",
  "kit halteres", "anilha", "caneleira de peso", "kettlebell", "mini band elástico", "colchonete academia",
  "corda de pular", "luva de academia", "roda abdominal", "barra fixa porta", "tapete de yoga", "bola suíça",
  "tênis de corrida", "tênis academia feminino", "garrafa academia", "mochila academia", "smartband",
];
const BUSCAS_FITNESS_POR_EXECUCAO = 3; // buscas de fitness/academia a cada execução
// Automotivo (carro e moto): lista própria, com buscas garantidas em toda execução
const PALAVRAS_AUTOMOTIVO = [
  // carro
  "suporte celular veicular", "carregador veicular", "aspirador automotivo", "compressor de ar portátil pneu",
  "câmera de ré", "central multimídia carro", "dash cam carro", "lâmpada super led farol", "tapete automotivo",
  "capa de banco automotivo", "organizador porta malas", "aromatizador carro", "kit limpeza automotiva",
  "cera automotiva", "película automotiva", "sensor de estacionamento", "macaco hidráulico", "cabo de chupeta",
  "som automotivo bluetooth", "transmissor fm veicular",
  // moto
  "capacete moto", "luva motociclista", "jaqueta motociclista", "capa de chuva moto", "bauleto moto",
  "suporte celular moto", "intercomunicador moto", "trava de disco moto", "antena corta pipa", "kit relação moto",
  "retrovisor moto", "óleo moto 10w30", "balaclava moto",
];
const BUSCAS_AUTOMOTIVO_POR_EXECUCAO = 3; // buscas de carro/moto a cada execução
// Beleza e moda feminina (maquiagem, unhas, skincare, cabelos, perfumes, roupas): lista própria,
// com buscas garantidas em toda execução
const PALAVRAS_BELEZA = [
  // maquiagem
  "batom matte", "batom líquido", "gloss labial", "base líquida", "corretivo", "pó compacto", "pó translúcido",
  "primer facial", "blush", "iluminador", "paleta de sombras", "máscara de cílios", "delineador",
  "lápis de sobrancelha", "cílios postiços", "pincel de maquiagem", "esponja de maquiagem", "kit maquiagem",
  "maquiagem ruby rose", "maquiagem vult", "maquiagem bruna tavares", "maybelline", "max love",
  // unhas
  "esmalte", "kit esmaltes", "kit manicure", "cabine led unha", "kit unha gel", "alicate de cutícula",
  // skincare e cabelos
  "sérum vitamina c", "hidratante facial", "protetor solar facial", "ácido hialurônico", "sabonete facial",
  "máscara capilar", "óleo capilar", "kit shampoo e condicionador", "escova secadora", "modelador de cachos",
  // perfumes
  "perfume feminino importado", "body splash",
  // moda feminina
  "vestido feminino", "conjunto feminino", "blusa feminina", "calça jeans feminina", "bolsa feminina",
  "sandália feminina", "pijama feminino", "biquíni",
];
const BUSCAS_BELEZA_POR_EXECUCAO = 4; // buscas de beleza/moda feminina a cada execução
// Natal (página /natal): árvores de vários tamanhos, decorações variadas, ceia e roupas natalinas.
// Lista própria, com buscas garantidas em toda execução durante a temporada.
const PALAVRAS_NATAL = [
  // árvores (tamanhos e tipos diferentes)
  "árvore de natal 1,20m", "árvore de natal 1,50m", "árvore de natal 1,80m", "árvore de natal 2,10m",
  "árvore de natal nevada", "árvore de natal branca", "árvore de natal pequena de mesa", "árvore de natal com led",
  "árvore de natal pinheiro luxo", "árvore de natal cheia", "árvore de natal fibra ótica", "árvore de natal parede",
  // enfeites da árvore
  "kit bolas de natal", "enfeites para árvore de natal", "ponteira estrela árvore de natal", "saia para árvore de natal",
  "laço de natal para árvore", "pendente de natal", "bola de natal dourada", "bola de natal vermelha",
  // luzes
  "pisca pisca led 100 lâmpadas", "pisca pisca cascata", "cortina de led natal", "fio de fada led",
  "pisca pisca solar", "mangueira luminosa led", "projetor led natal", "luminária de natal",
  // decoração da casa
  "guirlanda de natal", "presépio", "papai noel decorativo", "boneco de neve decorativo", "enfeite de porta natal",
  "festão de natal", "rena decorativa natal", "vila de natal", "trenó decorativo",
  // mesa e casa
  "toalha de mesa natal", "jogo americano natal", "caminho de mesa natal", "almofada de natal", "tapete de natal",
  "caneca de natal", "pratos de natal", "kit cozinha natal",
  // roupas, ceia e presentes
  "pijama de natal família", "gorro papai noel", "fantasia papai noel", "meia de natal", "suéter de natal",
  "panetone", "chocotone", "cesta de natal", "embalagem para presente natal", "papel de presente natal",
];
const BUSCAS_NATAL_POR_EXECUCAO = 4; // buscas de Natal a cada execução (só na temporada)
const BUSCAS_NICHOS_POR_EXECUCAO = 2; // buscas dessas áreas a cada execução — era 3
const BUSCAS_TECNOLOGIA_POR_EXECUCAO = 4; // buscas de tecnologia a cada execução — era 6
const BUSCAS_OUTRAS_POR_EXECUCAO = 4; // buscas das outras categorias a cada execução — era 5
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
  if (o.preco_atual < precoMinimoPara(o, r.mkt_preco_minimo)) return false; // beleza aceita mais barato
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

// Natal: só busca na temporada (1º de novembro até a véspera de Natal). Fora dela, a lista fica parada.
const emTemporadaDeNatal = () => {
  const hoje = new Date();
  const m = hoje.getMonth(); // 10 = novembro, 11 = dezembro
  return m === 10 || (m === 11 && hoje.getDate() <= 24);
};

// Palavras desta execução (rodízio pela hora do dia)
function rodizio(lista, quantas) {
  const blocos = Math.max(1, Math.ceil(lista.length / quantas));
  const vez = Math.floor(Date.now() / (30 * 60 * 1000)) % blocos; // muda a cada 30 min
  return lista.slice(vez * quantas, (vez + 1) * quantas);
}

function palavrasDaVez() {
  return [
    ...rodizio(PALAVRAS_CASA, BUSCAS_CASA_POR_EXECUCAO), // primeiro: prioridade
    ...rodizio(PALAVRAS_TECNOLOGIA, BUSCAS_TECNOLOGIA_POR_EXECUCAO),
    ...rodizio(PALAVRAS_OUTRAS, BUSCAS_OUTRAS_POR_EXECUCAO),
    ...rodizio(PALAVRAS_NICHOS, BUSCAS_NICHOS_POR_EXECUCAO),
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
