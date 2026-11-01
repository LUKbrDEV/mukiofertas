// Filtro de qualidade das ofertas de marketplace (Shopee e AliExpress), para o site não encher
// de bugiganga barata e de preço "de" inflado pelo vendedor.
// Salve como lib/qualidade.mjs. Usado pelo scripts/coletar.mjs (Shopee/AliExpress/Lomadee),
// pelo lib/salvar-oferta.js (Telegram) e pelo scripts/limpar-marketplace.mjs.
// Os números podem ser trocados no painel admin (Configurações → Shopee e AliExpress).

export const PADRAO_QUALIDADE = {
  mkt_preco_minimo: 40, // R$ — abaixo disso não entra (filtro de torneira de R$ 15, caneta de R$ 20...)
  mkt_desconto_maximo: 70, // % — acima disso o preço "de" quase sempre é inflado: não entra
  mkt_max_no_ar_shopee: 120, // ofertas da Shopee no ar ao mesmo tempo (as que já estão continuam)
  mkt_max_no_ar_aliexpress: 100, // o mesmo para o AliExpress
  shopee_nota_minima: 4.7, // estrelas
  shopee_vendas_minimas: 200, // produtos vendidos
  shopee_max_por_execucao: 15, // ofertas novas da Shopee a cada 30 minutos
};

export const LOJAS_MARKETPLACE = ["shopee", "aliexpress"];
export const ehMarketplace = (loja) => LOJAS_MARKETPLACE.includes(String(loja ?? "").toLowerCase());

const numero = (v, p) => (v !== undefined && v !== null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : p);

export function regrasDeQualidade(config = {}) {
  return Object.fromEntries(Object.entries(PADRAO_QUALIDADE).map(([k, p]) => [k, numero(config?.[k], p)]));
}

export function maximoNoAr(loja, r) {
  const l = String(loja ?? "").toLowerCase();
  if (l === "shopee") return r.mkt_max_no_ar_shopee;
  if (l === "aliexpress") return r.mkt_max_no_ar_aliexpress;
  return Infinity;
}

// Confere uma oferta de marketplace. Devolve null se está tudo certo, ou o motivo da recusa.
// (ofertas de outras lojas e cupons sempre passam)
export function motivoDeRecusa(oferta, r) {
  if (!ehMarketplace(oferta.loja) || oferta.categoria === "cupons") return null;
  const atual = Number(oferta.preco_atual ?? oferta.precoAtual);
  const antigo = Number(oferta.preco_antigo ?? oferta.precoAntigo);
  if (atual > 0 && atual < r.mkt_preco_minimo) return `preço abaixo de R$ ${r.mkt_preco_minimo}`;
  if (antigo > atual && atual > 0) {
    const desconto = ((antigo - atual) / antigo) * 100;
    if (desconto > r.mkt_desconto_maximo) return `desconto de ${Math.round(desconto)}% (acima de ${r.mkt_desconto_maximo}%: preço "de" inflado)`;
  }
  return null;
}
