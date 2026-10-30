// Lojas que aparecem com logo na página inicial (acima de "Promoções relâmpago").
// Salve como data/lojas.js.
//
// - nome: como aparece para o visitante
// - slug: usado no endereço (?loja=shopee)
// - nomesNoBanco: como a loja vem gravada na coluna "loja" das ofertas (pode ter mais de um)
// - logo: imagem em public/lojas/
// - cor: cor de fundo do botão (a mesma do fundo da logo)
// - artigo: "da" ou "do" (ex.: ofertas DA Shopee, ofertas DO Mercado Livre)
// A ordem aqui é a ordem na tela.

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
  {
    nome: "Magalu",
    slug: "magalu",
    nomesNoBanco: ["Magalu", "Magazine Luiza"],
    artigo: "da",
    logo: "/lojas/magalu.png",
    cor: "#0e89ff",
  },
];

export const lojaPorSlug = (slug) => lojasDestaque.find((l) => l.slug === slug) ?? null;
