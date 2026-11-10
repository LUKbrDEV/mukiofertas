// Deixa o título dos cupons fácil de entender.
// Salve como lib/titulo-cupom.mjs (usado pelo card do site e pelo pacote de cupons do WhatsApp).
//   "De R$ 4.500 por R$ 3.750 com cupom AFFNOV09 - ..."  →  "R$ 750 OFF em compras acima de R$ 4.500"
//   "R$ 50 OFF acima de R$ 299" e outros títulos já claros continuam iguais.

const VALOR = "R\\$\\s?(\\d{1,3}(?:\\.\\d{3})*(?:,\\d{1,2})?|\\d+(?:,\\d{1,2})?)";
const num = (t) => Number(String(t).replace(/\./g, "").replace(",", "."));
const reais = (v) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })}`;

// Preço escrito de qualquer jeito: "3.290,84", "3290,84", "3.290.84" (erro comum da Lomadee), "3290.84", "4.500"
function precoSolto(t) {
  const s = String(t ?? "").trim().replace(/[.,]+$/, "");
  if (!s) return NaN;
  if (s.includes(",")) return Number(s.replace(/\./g, "").replace(",", "."));
  const partes = s.split(".");
  // último pedaço com 1 ou 2 dígitos = centavos ("3.290.84" → 3290.84); com 3 dígitos = milhar ("4.500")
  if (partes.length > 1 && partes.at(-1).length <= 2) {
    return Number(`${partes.slice(0, -1).join("")}.${partes.at(-1)}`);
  }
  return Number(partes.join(""));
}

// "De R$ 4.500 por R$ 3.750 com cupom AFFNOV09 - PlayStation 5 Edição Digital" é um PRODUTO com cupom.
// "Por: R$ 3.290.84. Xiaomi Poco X8 Pro ... Utilize o cupom AEMEGA8 para economizar." também
// (só traz o preço final: "de" vem null e é buscado depois, na API da loja).
// Devolve { nome, de, por, codigo } ou null.
export function produtoComCupom(texto) {
  const t = String(texto ?? "").replace(/\s+/g, " ").trim();
  const m = t.match(new RegExp(`^\\s*de\\s+${VALOR}\\s+por\\s+${VALOR}(?:\\s+com\\s+(?:o\\s+)?cupom\\s+([A-Z0-9_-]{3,30}))?\\s*[-–—:|]\\s*(.{8,})$`, "i"));
  if (m) {
    const de = num(m[1]);
    const por = num(m[2]);
    if (!(de > por) || por <= 0) return null;
    return { nome: m[4].trim(), de, por, codigo: m[3] ?? null };
  }

  // Formato "Por: R$ 3.290.84. Nome do produto ... cupom CODIGO ..."
  const p = t.match(/^\s*por\s*:?\s*R\$\s?(\d[\d.,]*\d)\s*[.,;:|–—-]?\s+(.{8,})$/i);
  if (!p) return null;
  const por = precoSolto(p[1]);
  if (!(por > 0)) return null;
  const codigo = p[2].match(/cupom\s*:?\s*([A-Z0-9_-]{3,30})\b/i)?.[1] ?? null;
  // nome = primeira frase (até o primeiro ". " seguido de letra), sem a parte do cupom
  const nome = p[2]
    .split(/\.\s+(?=[a-zà-ú])/i)[0]
    .replace(/[,;]?\s*(utilize|use|usando|com)\s+(o\s+)?cupom.*$/i, "")
    .replace(/[.\s]+$/, "")
    .trim();
  if (nome.length < 8) return null;
  return { nome, de: null, por, codigo };
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
