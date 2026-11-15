// Quais ofertas vão primeiro para o grupo do WhatsApp.
// Salve como lib/grupo-whatsapp.mjs. Usado por scripts/postar-whatsapp.mjs e pelo painel admin.
//
// Cada departamento tem um nível (escolhido no painel → Configurações → WhatsApp):
//   🔥 prioridade        ganha pontos extras e vai na frente
//   ✅ normal            entra na disputa normal
//   🕐 de vez em quando  só X por dia (moda, sapatos...) e no máximo 1 por rodada
//   (desmarcado)         não vai para o grupo
//
// Pontos de cada oferta (maior primeiro):
//   pontos da página inicial (lib/vitrine.mjs: desconto confiável, marca conhecida, loja confiável,
//   cliques, UPs; desconto inflado PERDE pontos)
//   + bônus de prioridade
//   + bônus de "campeão de vendas" (air fryer, smart TV, celular, fone bluetooth...)
//   + bônus pelo que o seu público mais clicou nos últimos 30 dias (por categoria)
//
// Roupa e calçado contam como "de vez em quando" pelo TÍTULO também (camiseta, tênis, legging...),
// mesmo que estejam em outra categoria (ex.: "Roupas Fitness" dentro de Esporte e Lazer).

import { pontuar, regrasDaVitrine } from "./vitrine.mjs";

// Departamento -> subcategorias (igual ao data/ofertas.js). Usado só quando o painel ainda não salvou
// as listas prontas (whatsapp_categorias_prioridade / whatsapp_categorias_ocasional).
const SUBCATEGORIAS = {
  eletrodomesticos: ["geladeiras", "lavadoras", "fogoes", "micro-ondas", "air-fryer", "eletroportateis", "ar-condicionado"],
  smartphones: ["celulares", "acessorios-celular"],
  notebooks: ["notebook", "tablets", "acessorios-notebook"],
  tv: ["televisores", "acessorios-tv"],
  "cadeiras-mesas": [],
  casa: ["cama-banho", "limpeza", "casa-inteligente"],
  ferramentas: ["jardim", "ferramentas-eletricas", "ferramentas-manuais"],
  esporte: ["academia", "roupas-fitness", "ciclismo", "skate-patins", "camping-pesca", "esportes-bola"],
  mercado: ["cafe", "bebidas", "doces-snacks", "alimentos"],
  moda: ["moda-infantil", "moda-masculina", "moda-feminina", "camisas-de-time"],
  sapatos: [],
  mochilas: [],
  bebes: ["passeio-bebe", "alimentacao-bebe", "quarto-bebe", "seguranca-bebe", "higiene-bebe"],
  "escolar-infantil": [],
};
const comFilhos = (deps) => deps.flatMap((d) => [d, ...(SUBCATEGORIAS[d] ?? [])]);

export const DEPS_PRIORIDADE_PADRAO = [
  "eletrodomesticos", "smartphones", "notebooks", "tv", "cadeiras-mesas", "casa", "ferramentas", "esporte", "mercado",
];
export const DEPS_OCASIONAL_PADRAO = ["moda", "sapatos", "mochilas", "bebes", "escolar-infantil"];

export const PADRAO_GRUPO = {
  whatsapp_ocasional_por_dia: 3, // "de vez em quando": no máximo X por dia
  whatsapp_bonus_prioridade: 25, // pontos extras para os departamentos de prioridade
  whatsapp_max_mesma_categoria: 2, // variedade: no máximo X da mesma categoria por rodada
};

// Categorias que são sempre roupa/calçado (contam como "de vez em quando")
const CATEGORIAS_MODA = new Set([...comFilhos(["moda", "sapatos"]), "roupas-fitness"]);

// Palavras de roupa/calçado no título
const RE_MODA = new RegExp(
  "(^|[^a-zà-ú])(" +
    [
      "camiseta", "camisetas", "camisa", "camisas", "blusa", "blusas", "regata", "cropped", "calça", "calças", "bermuda",
      "bermudas", "shorts?", "vestido", "vestidos", "saia", "jaqueta", "jaquetas", "moletom", "moletons",
      "casaco", "agasalho", "corta[- ]vento", "cueca", "cuecas", "calcinha", "calcinhas", "sutiã", "lingerie", "meias",
      "pijama", "legging", "leggings", "top fitness", "macacão", "biquíni", "maiô", "sunga", "boné", "tênis", "sapatênis",
      "sapato", "sapatos", "sandália", "sandálias", "chinelo", "chinelos", "rasteirinha", "bota", "botas", "coturno",
      "tamanco", "mocassim", "sapatilha", "polo masculina", "polo feminina",
    ].join("|") +
    ")([^a-zà-ú]|$)",
  "i"
);
const NAO_E_MODA = /t[eê]nis de mesa|mesa de t[eê]nis|raquete|bola de t[eê]nis|sapateira|rack|suporte|organizador|varal|cabide/i;

export function ehModa(o) {
  if (CATEGORIAS_MODA.has(o.categoria)) return true;
  const titulo = String(o.titulo ?? "");
  return RE_MODA.test(titulo) && !NAO_E_MODA.test(titulo);
}

// Produtos que mais vendem no Brasil (palavras no título). Ganham um empurrão.
const CAMPEOES = [
  "air fryer", "fritadeira", "smart tv", "smartphone", "celular", "iphone", "galaxy", "redmi", "moto g",
  "fone bluetooth", "fone de ouvido", "earbuds", "airpods", "echo dot", "echo pop", "alexa", "fire tv", "kindle",
  "cafeteira", "dolce gusto", "nespresso", "ventilador", "climatizador", "ar-condicionado", "ar condicionado",
  "aspirador", "robô aspirador", "robo aspirador", "liquidificador", "batedeira", "mixer", "sanduicheira",
  "panela", "jogo de panelas", "panela elétrica", "panela de pressão", "micro-ondas", "microondas", "geladeira",
  "refrigerador", "freezer", "lavadora", "máquina de lavar", "lava e seca", "fogão", "cooktop", "forno elétrico",
  "notebook", "tablet", "ipad", "smartwatch", "caixa de som", "power bank", "carregador portátil", "ssd",
  "monitor", "cadeira gamer", "cadeira de escritório", "colchão", "garrafa térmica", "chaleira", "purificador",
  "furadeira", "parafusadeira", "lavadora de alta pressão", "whey", "creatina", "café", "sabão", "amaciante",
  "papel higiênico", "perfume",
];
const RE_CAMPEAO = new RegExp(
  `(^|[^a-zà-ú])(${CAMPEOES.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})([^a-zà-ú]|$)`,
  "i"
);
export const ehCampeaoDeVendas = (o) => RE_CAMPEAO.test(String(o.titulo ?? ""));

// Listas de categorias de cada nível (do painel; sem elas, os padrões acima)
export function niveisDoGrupo(config = {}) {
  const lista = (k) => (Array.isArray(config?.[k]) ? config[k] : null);
  const prioridade = lista("whatsapp_categorias_prioridade") ?? comFilhos(DEPS_PRIORIDADE_PADRAO);
  const ocasional = lista("whatsapp_categorias_ocasional") ?? comFilhos(DEPS_OCASIONAL_PADRAO);
  return { prioridade: new Set(prioridade), ocasional: new Set(ocasional) };
}

// "prioridade" | "ocasional" | "normal"
export function nivelDaOferta(o, niveis) {
  if (ehModa(o)) return "ocasional";
  if (niveis.prioridade.has(o.categoria)) return "prioridade";
  if (niveis.ocasional.has(o.categoria)) return "ocasional";
  return "normal";
}

// Bônus por categoria a partir dos cliques dos últimos 30 dias: a categoria mais clicada ganha +15,
// as outras ganham proporcionalmente. linhas = [{ categoria, cliques }]
export function bonusPorCliques(linhas = []) {
  const soma = new Map();
  for (const l of linhas) soma.set(l.categoria, (soma.get(l.categoria) ?? 0) + (Number(l.cliques) || 0));
  const maior = Math.max(0, ...soma.values());
  const bonus = new Map();
  if (maior > 0) for (const [cat, n] of soma) bonus.set(cat, Math.round((n / maior) * 15 * 10) / 10);
  return bonus;
}

export function pontuarParaGrupo(o, { config = {}, niveis, bonusCliques = new Map() } = {}) {
  const r = regrasDaVitrine(config);
  let base = pontuar(o, r);
  // sem preço "de": a vitrine não pontua; aqui conta como 1% de desconto (o resto da conta vale igual)
  if (base === -Infinity) base = pontuar({ ...o, preco_antigo: Number(o.preco_atual) / 0.99 }, r);
  const nivel = nivelDaOferta(o, niveis);
  const bonusPrioridade = Number(config?.whatsapp_bonus_prioridade ?? PADRAO_GRUPO.whatsapp_bonus_prioridade);
  let pontos = base;
  if (nivel === "prioridade") pontos += bonusPrioridade;
  if (nivel === "ocasional") pontos -= 10;
  if (ehCampeaoDeVendas(o) && !ehModa(o)) pontos += 12;
  pontos += bonusCliques.get(o.categoria) ?? 0;
  return { pontos, nivel };
}
