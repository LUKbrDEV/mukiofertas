// Deixa o título dos cupons fácil de entender.
// Salve como lib/titulo-cupom.mjs (usado pelo card do site e pelo pacote de cupons do WhatsApp).
//   "De R$ 4.500 por R$ 3.750 com cupom AFFNOV09 - ..."  →  "R$ 750 OFF em compras acima de R$ 4.500"
//   "R$ 50 OFF acima de R$ 299" e outros títulos já claros continuam iguais.

const VALOR = "R\\$\\s?(\\d{1,3}(?:\\.\\d{3})*(?:,\\d{1,2})?|\\d+(?:,\\d{1,2})?)";
const num = (t) => Number(String(t).replace(/\./g, "").replace(",", "."));
const reais = (v) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })}`;

// "De R$ 4.500 por R$ 3.750 com cupom AFFNOV09 - PlayStation 5 Edição Digital" é um PRODUTO com cupom.
// Devolve { nome, de, por, codigo } ou null.
export function produtoComCupom(texto) {
  const t = String(texto ?? "").replace(/\s+/g, " ").trim();
  const m = t.match(new RegExp(`^\\s*de\\s+${VALOR}\\s+por\\s+${VALOR}(?:\\s+com\\s+(?:o\\s+)?cupom\\s+([A-Z0-9_-]{3,30}))?\\s*[-–—:|]\\s*(.{8,})$`, "i"));
  if (!m) return null;
  const de = num(m[1]);
  const por = num(m[2]);
  if (!(de > por) || por <= 0) return null;
  return { nome: m[4].trim(), de, por, codigo: m[3] ?? null };
}

export function tituloDoCupom(titulo) {
  const t = String(titulo ?? "").replace(/\s+/g, " ").trim();
  // produto com cupom que ainda está gravado como cupom: mostra o nome do produto
  const p = produtoComCupom(t);
  if (p) return `${p.nome} por ${reais(p.por)} com cupom`;
  const m = t.match(new RegExp(`^\\s*de\\s+${VALOR}\\s+por\\s+${VALOR}`, "i"));
  if (!m) return t;
  const de = num(m[1]);
  const por = num(m[2]);
  if (!(de > por) || por <= 0) return t;
  return `${reais(Math.round((de - por) * 100) / 100)} OFF em compras acima de ${reais(de)}`;
}
