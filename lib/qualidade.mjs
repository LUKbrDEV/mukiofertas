// Filtro de qualidade das ofertas de marketplace (Shopee e AliExpress), para o site não encher
// de bugiganga barata e de preço "de" inflado pelo vendedor.
// Salve como lib/qualidade.mjs. Usado pelo scripts/coletar.mjs (Shopee/AliExpress/Lomadee),
// pelo lib/salvar-oferta.js (Telegram) e pelo scripts/limpar-marketplace.mjs.
// Os números podem ser trocados no painel admin (Configurações → Shopee e AliExpress).

import { classificar } from "./classificar.mjs";

export const PADRAO_QUALIDADE = {
  mkt_preco_minimo: 40, // R$ — abaixo disso não entra (filtro de torneira de R$ 15, caneta de R$ 20...)
  mkt_desconto_maximo: 70, // % — acima disso o preço "de" quase sempre é inflado: não entra
  mkt_max_no_ar_shopee: 300, // ofertas da Shopee no ar ao mesmo tempo (nunca passa de MAXIMO_ABSOLUTO_NO_AR)
  mkt_max_no_ar_aliexpress: 300, // o mesmo para o AliExpress
  shopee_nota_minima: 4.7, // estrelas
  shopee_vendas_minimas: 200, // produtos vendidos
  shopee_max_por_execucao: 25, // ofertas novas da Shopee por execução da coleta — era 15
};

// Maquiagem, unhas, skincare e cabelos têm muito produto bom e barato (batom, esmalte, pincel, sérum):
// para essas categorias o preço mínimo é menor (vale para Shopee, AliExpress e Mercado Livre).
export const PRECO_MINIMO_BELEZA = 15; // R$
export const CATEGORIAS_BELEZA_BARATA = new Set(["maquiagem", "skincare", "cabelos"]);

// Natal: bolas, pisca-pisca, guirlandas e meias de Natal custam pouco; com R$ 40 a decoração some do site.
// (as árvores continuam com o mínimo normal, para não entrar árvore minúscula de R$ 15)
export const PRECO_MINIMO_NATAL = 20; // R$
export const CATEGORIAS_NATAL_BARATA = new Set(["decoracao-natal", "natal"]);

// Preço mínimo para uma oferta: o padrão da loja ou o de beleza/Natal (o menor dos dois)
export function precoMinimoPara(oferta, padrao) {
  const categoria = oferta?.categoria ?? classificar(oferta?.titulo ?? "", oferta?.loja);
  if (CATEGORIAS_BELEZA_BARATA.has(categoria)) return Math.min(padrao, PRECO_MINIMO_BELEZA);
  if (CATEGORIAS_NATAL_BARATA.has(categoria)) return Math.min(padrao, PRECO_MINIMO_NATAL);
  return padrao;
}

export const LOJAS_MARKETPLACE = ["shopee", "aliexpress"];
export const ehMarketplace = (loja) => LOJAS_MARKETPLACE.includes(String(loja ?? "").toLowerCase());

const numero = (v, p) => (v !== undefined && v !== null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : p);

export function regrasDeQualidade(config = {}) {
  return Object.fromEntries(Object.entries(PADRAO_QUALIDADE).map(([k, p]) => [k, numero(config?.[k], p)]));
}

// Teto fixo de ofertas no ar por marketplace (Shopee e AliExpress, cada um). Mesmo que o painel
// tenha um número maior, nunca passa disso: o Mercado Livre deve ter tanto ou mais ofertas que eles.
export const MAXIMO_ABSOLUTO_NO_AR = 300;

export function maximoNoAr(loja, r) {
  const l = String(loja ?? "").toLowerCase();
  if (l === "shopee") return Math.min(r.mkt_max_no_ar_shopee, MAXIMO_ABSOLUTO_NO_AR);
  if (l === "aliexpress") return Math.min(r.mkt_max_no_ar_aliexpress, MAXIMO_ABSOLUTO_NO_AR);
  return Infinity;
}

// ----- Categorias prioritárias (as que mais vendem) -----
// Eletrodomésticos, ar-condicionado/climatização, exaustores/coifas, TVs e eletrônicos para casa.
// Elas são buscadas primeiro, ganham vaga antes das outras e são as últimas a sair quando a loja
// passa do limite. As outras categorias podem ocupar no máximo FRACAO_MAX_OUTRAS das vagas da loja.
export const CATEGORIAS_PRIORITARIAS = new Set([
  "geladeiras", "lavadoras", "micro-ondas", "air-fryer", "fogoes", "eletroportateis", "ar-condicionado",
  "televisores", "casa-inteligente", "eletronicos", "caixas-de-som",
]);
export const ehPrioritaria = (categoria) => CATEGORIAS_PRIORITARIAS.has(String(categoria ?? ""));
export const FRACAO_MAX_OUTRAS = 0.45; // 45% das vagas para o resto; o mínimo de 55% fica para as prioritárias

// Confere uma oferta de marketplace. Devolve null se está tudo certo, ou o motivo da recusa.
// (ofertas de outras lojas e cupons sempre passam)
export function motivoDeRecusa(oferta, r) {
  if (!ehMarketplace(oferta.loja) || oferta.categoria === "cupons") return null;
  const atual = Number(oferta.preco_atual ?? oferta.precoAtual);
  const antigo = Number(oferta.preco_antigo ?? oferta.precoAntigo);
  const minimo = precoMinimoPara(oferta, r.mkt_preco_minimo);
  if (atual > 0 && atual < minimo) return `preço abaixo de R$ ${minimo}`;
  if (antigo > atual && atual > 0) {
    const desconto = ((antigo - atual) / antigo) * 100;
    if (desconto > r.mkt_desconto_maximo) return `desconto de ${Math.round(desconto)}% (acima de ${r.mkt_desconto_maximo}%: preço "de" inflado)`;
  }
  return null;
}

// ----- Lojas bloqueadas (valem para todas as fontes: Lomadee, Shopee, AliExpress, Awin e Telegram) -----
// Confere o nome da loja e também o título ("Cama Montessoriana ... | Little Duck").
// Escreva em minúsculas. Para liberar de novo, é só tirar da lista.
export const LOJAS_BLOQUEADAS = ["little duck"];

export function lojaBloqueada(oferta) {
  const texto = `${oferta?.loja ?? ""} ${oferta?.titulo ?? ""}`.toLowerCase();
  return LOJAS_BLOQUEADAS.some((nome) => texto.includes(nome));
}
