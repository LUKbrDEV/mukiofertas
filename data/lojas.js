// Lojas que aparecem com logo na página inicial (acima de "Promoções relâmpago").
// Salve como data/lojas.js.
//
// - nome: como aparece para o visitante
// - slug: usado no endereço (?loja=shopee)
// - nomesNoBanco: como a loja vem gravada na coluna "loja" das ofertas (pode ter mais de um)
// - logo: imagem em public/lojas/ (lojas sem logo aparecem com o nome escrito)
// - cor: cor de fundo do botão (a mesma do fundo da logo)
// - artigo: "da" ou "do" (ex.: ofertas DA Shopee, ofertas DO Mercado Livre)
// A ordem aqui é a ordem na tela. Para voltar com a Magalu (a logo continua em public/lojas/magalu.png):
//   { nome: "Magalu", slug: "magalu", nomesNoBanco: ["Magalu", "Magazine Luiza"], artigo: "da", logo: "/lojas/magalu.png", cor: "#0e89ff" },

export const lojasDestaque = [
  { nome: "Amazon", slug: "amazon", nomesNoBanco: ["Amazon"], artigo: "da", logo: "/lojas/amazon.png", cor: "#222222" },
  {
    nome: "Mercado Livre",
    slug: "mercado-livre",
    nomesNoBanco: ["Mercado Livre", "MercadoLivre"],
    artigo: "do",
    logo: "/lojas/mercado-livre.png",
    cor: "#ffe600",
  },
  {
    nome: "AliExpress",
    slug: "aliexpress",
    nomesNoBanco: ["AliExpress", "Aliexpress"],
    artigo: "do",
    logo: "/lojas/aliexpress.png",
    cor: "#ff2651",
  },
  { nome: "Shopee", slug: "shopee", nomesNoBanco: ["Shopee"], artigo: "da", logo: "/lojas/shopee.png", cor: "#f6412e" },
];

export const lojaPorSlug = (slug) => lojasDestaque.find((l) => l.slug === slug) ?? null;

// Qual loja configurada acima corresponde a um nome gravado nas ofertas (ou null)
export const lojaDoNome = (nome) =>
  lojasDestaque.find((l) => l.nomesNoBanco.some((n) => n.toLowerCase() === String(nome).toLowerCase())) ?? null;

// Cor do cartão das lojas que ainda não têm logo (sempre a mesma para a mesma loja)
const CORES = ["#1e293b", "#1d4ed8", "#7c3aed", "#0f766e", "#be123c", "#c2410c", "#4d7c0f", "#0369a1", "#9d174d", "#334155"];
export function corDaLoja(nome) {
  let h = 0;
  for (const ch of String(nome)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CORES[h % CORES.length];
}
