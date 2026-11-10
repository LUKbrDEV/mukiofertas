// Cupom fixo de uma loja: aparece em TODAS as ofertas dela que não têm outro cupom
// (site, página da oferta, Telegram e WhatsApp), inclusive nas que já estão no ar.
// Salve como lib/cupom-loja.mjs. Para outra loja, é só acrescentar uma linha na lista.

export const CUPONS_DA_LOJA = [
  { loja: /netshoes/i, codigo: "MUKIOFERTAS", percentual: 10 },
];

export function cupomDaLoja(loja) {
  return CUPONS_DA_LOJA.find((c) => c.loja.test(String(loja ?? ""))) ?? null;
}

// Devolve a oferta com o cupom da loja (se ela ainda não tiver cupom).
// cupom_percentual: % do cupom fixo, para mostrar o preço com o cupom.
export function comCupomDaLoja(oferta) {
  if (!oferta || oferta.categoria === "cupons") return oferta;
  const c = cupomDaLoja(oferta.loja);
  if (!c) return oferta;
  if (oferta.cupom && String(oferta.cupom).toUpperCase() !== c.codigo) return oferta; // já tem outro cupom
  return { ...oferta, cupom: c.codigo, cupom_percentual: c.percentual };
}

// Preço pagando com o cupom fixo (null se não tiver)
export function precoComCupom(oferta) {
  const p = Number(oferta?.cupom_percentual);
  const atual = Number(oferta?.preco_atual);
  if (!(p > 0) || !(atual > 0)) return null;
  return Math.round(atual * (1 - p / 100) * 100) / 100;
}
