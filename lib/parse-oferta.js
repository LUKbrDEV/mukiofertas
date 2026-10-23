const DOMINIOS_IGNORADOS = ["t.me", "telegram.me", "wa.me", "chat.whatsapp.com", "whatsapp.com"];

const LOJAS = [
  { nome: "Amazon", chaves: ["amazon.", "amzn.", "amaznlink"] },
  { nome: "Mercado Livre", chaves: ["mercadolivre", "mercadolibre", "meli.la"] },
  { nome: "Shopee", chaves: ["shopee", "shp.ee"] },
  { nome: "KaBuM!", chaves: ["kabum"] },
  { nome: "Magalu", chaves: ["magazineluiza", "magalu", "magazinevoce"] },
  { nome: "AliExpress", chaves: ["aliexpress"] },
];

function extrairLinks(texto) {
  return (texto.match(/https?:\/\/[^\s)>\]"']+/g) || [])
    .map((l) => l.replace(/[.,;!?]+$/, ""))
    .filter((l) => !DOMINIOS_IGNORADOS.some((d) => l.includes(d)));
}

function paraNumero(bruto) {
  let s = bruto.trim();
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (!/^\d+\.\d{1,2}$/.test(s)) s = s.replace(/\./g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export function parseOferta(textoBruto) {
  const texto = String(textoBruto || "").replace(/\r/g, "").trim();
  if (!texto) return null;

  // Link: prefere o que vem depois de "Compre aqui"
  const idx = texto.search(/compre aqui/i);
  const links =
    (idx >= 0 ? extrairLinks(texto.slice(idx)) : []).concat(extrairLinks(texto));
  const link = links[0] || null;

  // Preço: prefere o valor depois de "por R$"
  const preco =
    texto.match(/por\s*R\$\s*([\d.]+(?:,\d{1,2})?)/i) ||
    texto.match(/R\$\s*([\d.]+(?:,\d{1,2})?)/);
  const price = preco ? paraNumero(preco[1]) : null;

  // Cupom (código em MAIÚSCULAS, na mesma linha)
  const cupomMatch = texto.match(/cupom[ \t]*:?[ \t]*([A-Za-z0-9_-]{3,30})/i);
  const cupom =
    cupomMatch && cupomMatch[1] === cupomMatch[1].toUpperCase()
      ? cupomMatch[1]
      : null;

  // Título: primeira linha com letras que não seja preço nem "Compre aqui"
  const linhas = texto
    .split("\n")
    .map((l) => l.replace(/https?:\/\/\S+/g, "").trim())
    .filter(Boolean);
  const titulo = (
    linhas.find(
      (l) => !/^R\$/i.test(l) && !/compre aqui/i.test(l) && /\p{L}/u.test(l)
    ) || ""
  )
    .replace(/[*_`~]/g, "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim()
    .slice(0, 200);

  if (!titulo || !link) return null;

  const loja =
    LOJAS.find((l) => l.chaves.some((c) => link.toLowerCase().includes(c)))?.nome ||
    null;

  return { titulo, price, link, cupom, loja };
}