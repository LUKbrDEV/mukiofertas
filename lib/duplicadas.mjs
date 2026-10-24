// Regras para reconhecer ofertas duplicadas.
// Duas ofertas são "a mesma" quando têm a mesma loja, o mesmo título e o mesmo preço.

export function normalizarTitulo(titulo) {
  return String(titulo || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // tira acentos
    .replace(/[^a-z0-9]+/g, " ") // tira pontuação e símbolos
    .trim()
    .slice(0, 70); // só o começo: fontes diferentes cortam o título em tamanhos diferentes
}

// Aceita tanto { preco_atual } (banco) quanto o mesmo formato usado pelo coletor
export function chaveDaOferta({ loja, titulo, preco_atual }) {
  const centavos = Math.round(Number(preco_atual || 0) * 100);
  return `${loja}|${normalizarTitulo(titulo)}|${centavos}`;
}