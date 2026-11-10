// Regras da vitrine da página inicial: quais ofertas aparecem primeiro e quais ficam de fora.
// Salve como lib/vitrine.mjs. Usado pelo app/page.js.
//
// Cada oferta ganha uma pontuação:
//   + desconto confiável   (desconto exagerado em marketplace PERDE pontos em vez de ganhar)
//   + cliques               (o que o público está clicando)
//   + marca conhecida       (Samsung, LG, JBL, Kingston... convertem mais)
//   + loja confiável        (Amazon, Mercado Livre, KaBuM!)
//   + preço de produto bom  (um pouco a mais para produtos de maior valor)
//   + destaque marcado por você
//   − tempo no ar           (oferta velha perde pontos aos poucos)
// Os números podem ser trocados no painel admin (Configurações → Página inicial).

export const PADRAO_VITRINE = {
  home_teto_desconto_marketplace: 60, // % — acima disso, Shopee/AliExpress perdem pontos (desconto suspeito)
  home_teto_desconto_outras: 85, // % — o mesmo para as outras lojas
  home_bonus_marca: 15, // pontos para marca conhecida
  home_bonus_loja: 10, // pontos para Amazon, Mercado Livre e KaBuM!
  home_horas_destaque: 48, // nas faixas de destaque, só ofertas publicadas nas últimas X horas
  home_horas_relampago: 24, // relâmpago: só ofertas das últimas X horas
  home_max_por_categoria: 2, // variedade: no máximo X da mesma categoria em cada faixa
  home_max_por_loja: 3, // variedade: no máximo X da mesma loja em cada faixa
};

const MARKETPLACES = ["shopee", "aliexpress"];
const LOJAS_CONFIAVEIS = ["amazon", "mercado livre", "mercadolivre", "kabum!", "kabum", "kabum br"];

// Marcas que o público reconhece (procuradas como palavra inteira no título)
const MARCAS = [
  "samsung", "lg", "apple", "iphone", "ipad", "macbook", "xiaomi", "redmi", "poco", "motorola", "moto g", "sony",
  "playstation", "ps5", "xbox", "nintendo", "jbl", "philips", "philco", "britania", "britânia", "mondial", "electrolux",
  "brastemp", "consul", "arno", "oster", "tcl", "aoc", "hisense", "dell", "lenovo", "acer", "asus", "hp", "msi",
  "gigabyte", "kingston", "hyperx", "corsair", "logitech", "razer", "redragon", "husky", "aorus", "rise mode", "lexar",
  "wd", "western digital", "seagate", "crucial", "sandisk", "intel", "amd", "ryzen", "nvidia", "geforce", "rtx", "radeon",
  "tp-link", "tplink", "intelbras", "multilaser", "positivo", "echo dot", "alexa", "kindle", "fire tv", "nike", "adidas",
  "puma", "olympikus", "mizuno", "tramontina", "wap", "bosch", "makita", "dewalt", "black+decker", "stanley", "lego",
  "hot wheels", "barbie", "nescafe", "dolce gusto", "nespresso", "garmin", "amazfit", "anker", "baseus", "edifier",
  "havit", "qcy", "soundcore", "hoka", "asics", "new balance", "under armour", "boticário", "natura", "loreal", "l'oréal",
];
const RE_MARCA = new RegExp(`(^|[^a-z0-9])(${MARCAS.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})([^a-z0-9]|$)`, "i");

const numero = (v, p) => (v !== undefined && v !== null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : p);

export function regrasDaVitrine(config = {}) {
  return Object.fromEntries(Object.entries(PADRAO_VITRINE).map(([k, p]) => [k, numero(config?.[k], p)]));
}

export function descontoDe(o) {
  const a = Number(o.preco_antigo);
  const p = Number(o.preco_atual);
  return a > 0 && p > 0 && a > p ? Math.round(((a - p) / a) * 100) : 0;
}

export const ehMarketplace = (o) => MARKETPLACES.includes(String(o.loja).toLowerCase());
export const temMarcaConhecida = (o) => RE_MARCA.test(String(o.titulo ?? ""));

const horasNoAr = (o) =>
  o.publicada_em ? Math.max(0, (Date.now() - new Date(o.publicada_em).getTime()) / 3600000) : 999;

export function pontuar(o, r) {
  const d = descontoDe(o);
  if (!d) return -Infinity; // sem preço antigo: não entra nas faixas de destaque
  const teto = ehMarketplace(o) ? r.home_teto_desconto_marketplace : r.home_teto_desconto_outras;
  // até o teto o desconto vale pontos; acima dele, cada ponto a mais TIRA 2 pontos (preço "de" inflado)
  const suspeito = d > teto;
  const descontoConfiavel = suspeito ? teto - (d - teto) * 2 : d;

  const loja = String(o.loja).toLowerCase();
  const preco = Number(o.preco_atual) || 0;
  let pontos = descontoConfiavel;
  pontos += Math.min(Number(o.cliques) || 0, 50) * 1.5;
  // marca conhecida com desconto suspeito costuma ser anúncio de vendedor duvidoso: sem bônus
  if (temMarcaConhecida(o) && !suspeito) pontos += r.home_bonus_marca;
  if (LOJAS_CONFIAVEIS.includes(loja)) pontos += r.home_bonus_loja;
  if (o.destaque) pontos += 10;
  if (o.cupom) pontos += 3;
  if (preco > 0) pontos += Math.min(10, Math.log10(preco) * 3); // R$ 100 ≈ +6, R$ 1.000 ≈ +9
  // depois de 12 horas no ar, perde 0,4 ponto por hora
  pontos -= Math.max(0, horasNoAr(o) - 12) * 0.4;
  return pontos;
}

// Ordena pela pontuação e escolhe com variedade (limite por categoria e por loja)
export function escolherComVariedade(
  ofertas,
  r,
  { maximo = 12, horas, ignorar = new Set(), ordenar = true, maxPorCategoria = r.home_max_por_categoria, maxPorLoja = r.home_max_por_loja } = {}
) {
  const porCategoria = new Map();
  const porLoja = new Map();
  const escolhidas = [];
  const lista = ofertas
    .filter((o) => !o.expirada && !ignorar.has(o.id))
    .filter((o) => !horas || horasNoAr(o) <= horas)
    .map((o) => ({ o, pontos: pontuar(o, r) }))
    .filter((x) => x.pontos > -Infinity);
  if (ordenar) lista.sort((a, b) => b.pontos - a.pontos);

  for (const { o } of lista) {
    const cat = o.categoria ?? "-";
    const loja = String(o.loja).toLowerCase();
    if ((porCategoria.get(cat) ?? 0) >= maxPorCategoria) continue;
    if ((porLoja.get(loja) ?? 0) >= maxPorLoja) continue;
    porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + 1);
    porLoja.set(loja, (porLoja.get(loja) ?? 0) + 1);
    escolhidas.push(o);
    if (escolhidas.length >= maximo) break;
  }
  return escolhidas;
}

// Desconto acima do teto (Shopee/AliExpress 60%, outras 85%): preço "de" provavelmente inflado
export function descontoSuspeito(o, r) {
  const teto = ehMarketplace(o) ? r.home_teto_desconto_marketplace : r.home_teto_desconto_outras;
  return descontoDe(o) > teto;
}

// 💸 Maiores descontos que dá para confiar: sem desconto inflado e a partir de R$ 50
// (produto baratinho com 80% OFF não chama tanta atenção quanto um bom produto com 50% OFF)
export function maioresDescontos(ofertas, r, { maximo = 12, ignorar = new Set(), precoMinimo = 50 } = {}) {
  const lista = ofertas
    .filter((o) => !o.expirada && Number(o.preco_atual) >= precoMinimo && descontoDe(o) > 0 && !descontoSuspeito(o, r))
    .sort((a, b) => descontoDe(b) - descontoDe(a) || (Number(b.cliques) || 0) - (Number(a.cliques) || 0));
  return escolherComVariedade(lista, r, { maximo, ignorar, ordenar: false });
}

// 🪙 Mais baratos: compra por impulso. Do mais barato para o mais caro, mas só com desconto de
// verdade (a partir de 20%, sem desconto inflado), de R$ 10 a R$ 100, com variedade de loja e categoria.
export function maisBaratos(
  ofertas,
  r,
  { maximo = 12, ignorar = new Set(), precoMinimo = 10, precoMaximo = 100, descontoMinimo = 20 } = {}
) {
  const lista = ofertas
    .filter((o) => {
      const p = Number(o.preco_atual);
      return (
        !o.expirada &&
        o.categoria !== "cupons" &&
        p >= precoMinimo &&
        p <= precoMaximo &&
        descontoDe(o) >= descontoMinimo &&
        !descontoSuspeito(o, r)
      );
    })
    // mais barato primeiro; no empate, marca conhecida e mais desconto na frente
    .sort(
      (a, b) =>
        Number(a.preco_atual) - Number(b.preco_atual) ||
        Number(temMarcaConhecida(b)) - Number(temMarcaConhecida(a)) ||
        descontoDe(b) - descontoDe(a)
    );
  return escolherComVariedade(lista, r, { maximo, ignorar, ordenar: false });
}

// 🆕 Recentes com variedade (para a faixa: não deixa uma loja só ocupar a linha toda)
export function recentesComVariedade(ofertas, r, { maximo = 12, ignorar = new Set() } = {}) {
  const lista = ofertas
    .filter((o) => !o.expirada && descontoDe(o) > 0)
    .sort((a, b) => new Date(b.publicada_em ?? 0) - new Date(a.publicada_em ?? 0));
  return escolherComVariedade(lista, r, { maximo, ignorar, ordenar: false });
}
