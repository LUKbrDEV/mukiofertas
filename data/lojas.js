// Lojas que aparecem com logo na página inicial (acima de "Promoções relâmpago").
// Salve como data/lojas.js.
//
// - nome: como aparece para o visitante
// - slug: usado no endereço (?loja=shopee)
// - nomesNoBanco: como a loja vem gravada na coluna "loja" das ofertas (pode ter mais de um)
// - logo: imagem em public/lojas/ (lojas sem logo aparecem com o nome escrito)
// - cor: cor de fundo do botão (a mesma do fundo da logo)
// - artigo: "da" ou "do" (ex.: ofertas DA Shopee, ofertas DO Mercado Livre)
// SÓ as lojas desta lista aparecem na faixa da página inicial. Para colocar uma loja nova:
//   1) salve a logo (PNG sem fundo, de preferência branca) em public/lojas/nome-da-loja.png
//   2) copie uma das linhas abaixo e troque nome, slug, nomesNoBanco, logo e cor
//   3) em nomesNoBanco, coloque TODOS os nomes com que a loja aparece nas ofertas
//      (a mesma loja pode vir com nomes diferentes de cada rede, ex.: "KaBuM!" e "Kabum BR")
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
    nome: "KaBuM!",
    slug: "kabum",
    nomesNoBanco: ["KaBuM!", "KaBuM", "Kabum", "Kabum BR", "KaBuM BR"], // Awin, Telegram e Lomadee
    artigo: "da",
    logo: "/lojas/kabum.png",
    cor: "#0060b1",
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
  // Netshoes e Dafiti: sem logo por enquanto (aparece o nome escrito na cor da loja).
  // Com a logo salva em public/lojas/netshoes.png ou dafiti.png, troque null pelo caminho ("/lojas/netshoes.png").
  { nome: "Netshoes", slug: "netshoes", nomesNoBanco: ["Netshoes", "Netshoes BR"], artigo: "da", logo: null, cor: "#5a1e8c" },
  { nome: "Dafiti", slug: "dafiti", nomesNoBanco: ["Dafiti", "Dafiti BR"], artigo: "da", logo: null, cor: "#111111" },
];

export const lojaPorSlug = (slug) => lojasDestaque.find((l) => l.slug === slug) ?? null;

// Qual loja configurada acima corresponde a um nome gravado nas ofertas (ou null).
// Aceita as variações das redes: "Aliexpress BR", "Kabum Brasil", "MERCADO LIVRE" etc.
const simplificar = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.com(\.br)?$/g, "")
    .replace(/\s+(br|brasil|brazil|oficial|loja oficial)$/g, "")
    .replace(/[^a-z0-9]/g, "");
export const lojaDoNome = (nome) => {
  const alvo = simplificar(nome);
  if (!alvo) return null;
  return (
    lojasDestaque.find((l) => l.nomesNoBanco.some((n) => n.toLowerCase() === String(nome).toLowerCase())) ??
    lojasDestaque.find((l) => [l.nome, ...l.nomesNoBanco].some((n) => simplificar(n) === alvo)) ??
    null
  );
};

// Cor do cartão das lojas que ainda não têm logo (sempre a mesma para a mesma loja)
const CORES = ["#1e293b", "#1d4ed8", "#7c3aed", "#0f766e", "#be123c", "#c2410c", "#4d7c0f", "#0369a1", "#9d174d", "#334155"];
export function corDaLoja(nome) {
  let h = 0;
  for (const ch of String(nome)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CORES[h % CORES.length];
}
