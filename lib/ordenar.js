// Ordenação das ofertas nas páginas de categoria. Salve como lib/ordenar.js.
// As expiradas continuam sempre no fim, em qualquer ordem escolhida.

export const ORDENS = [
  { valor: "recentes", nome: "Mais recentes" },
  { valor: "menor-preco", nome: "Menor preço" },
  { valor: "maior-preco", nome: "Maior preço" },
  { valor: "maior-desconto", nome: "Maior desconto" },
  { valor: "a-z", nome: "Nome: A a Z" },
  { valor: "z-a", nome: "Nome: Z a A" },
];

export const ORDEM_PADRAO = "recentes";

const preco = (o) => Number(o.preco_atual) || 0;
const desconto = (o) =>
  o.preco_antigo && Number(o.preco_antigo) > preco(o) ? (Number(o.preco_antigo) - preco(o)) / Number(o.preco_antigo) : 0;
const porNome = (a, b) => String(a.titulo).localeCompare(String(b.titulo), "pt-BR", { sensitivity: "base" });

const COMPARADORES = {
  "menor-preco": (a, b) => preco(a) - preco(b),
  "maior-preco": (a, b) => preco(b) - preco(a),
  "maior-desconto": (a, b) => desconto(b) - desconto(a),
  "a-z": porNome,
  "z-a": (a, b) => porNome(b, a),
};

export function ordemValida(ordem) {
  return ORDENS.some((o) => o.valor === ordem) ? ordem : ORDEM_PADRAO;
}

export function ordenarOfertas(ofertas, ordem) {
  const comparar = COMPARADORES[ordemValida(ordem)];
  if (!comparar) return ofertas; // "recentes": mantém a ordem que veio do banco
  const ativas = ofertas.filter((o) => !o.expirada).sort(comparar);
  const expiradas = ofertas.filter((o) => o.expirada).sort(comparar);
  return [...ativas, ...expiradas];
}