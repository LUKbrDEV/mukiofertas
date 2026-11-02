// Lojas que podem ter cupom no site (aba Cupons). Cupons de outras lojas não entram,
// venham da Lomadee, da Awin ou do Telegram.
// Salve como lib/lojas-cupom.mjs. Usado pelo scripts/fontes/cupons.mjs e pelo lib/salvar-oferta.js.
// A escolha fica no painel admin (Configurações → Cupons).

// Lojas grandes reconhecidas (o nome pode vir diferente de cada rede: "Kabum BR", "Magazine Luiza"...)
export const LOJAS_GRANDES = [
  { nome: "Amazon", re: /amazon/i },
  { nome: "Mercado Livre", re: /mercado\s*livre|mercadolivre|mercadolibre/i },
  { nome: "Shopee", re: /shopee/i },
  { nome: "KaBuM!", re: /kabum/i },
  { nome: "Magalu", re: /magalu|magazine\s*luiza/i },
  { nome: "AliExpress", re: /aliexpress/i },
  { nome: "Casas Bahia", re: /casas\s*bahia/i },
  { nome: "Americanas", re: /americanas/i },
];

// Padrão: as 5 lojas grandes
export const LOJAS_CUPOM_PADRAO = ["Amazon", "Mercado Livre", "Shopee", "KaBuM!", "Magalu"];

export function lojasDeCupom(config = {}) {
  return Array.isArray(config?.cupons_lojas) ? config.cupons_lojas : LOJAS_CUPOM_PADRAO;
}

// A loja do cupom está entre as escolhidas?
export function lojaDeCupomPermitida(loja, permitidas = LOJAS_CUPOM_PADRAO) {
  const texto = String(loja ?? "");
  return LOJAS_GRANDES.some((l) => permitidas.includes(l.nome) && l.re.test(texto));
}
