const DOMINIOS_IGNORADOS = ["t.me", "telegram.me", "wa.me", "chat.whatsapp.com", "whatsapp.com"];

const LOJAS = [
  { nome: "Amazon", chaves: ["amazon.", "amzn.", "amaznlink"] },
  { nome: "Mercado Livre", chaves: ["mercadolivre", "mercadolibre", "meli.la"] },
  { nome: "Shopee", chaves: ["shopee", "shp.ee"] },
  { nome: "KaBuM!", chaves: ["kabum"] },
  { nome: "Magalu", chaves: ["magazineluiza", "magalu", "magazinevoce"] },
  { nome: "AliExpress", chaves: ["aliexpress"] },
];

// Ajuste os nomes das categorias para os mesmos que o seu site já usa
const CATEGORIAS = [
  { nome: "Games", chaves: ["playstation", "ps5", "ps4", "xbox", "nintendo", "gamer", "controle", "console"] },
  { nome: "Tecnologia", chaves: ["notebook", "celular", "smartphone", "iphone", "samsung", "xiaomi", "fone", "tv ", "smart tv", "monitor", "mouse", "teclado", "ssd", "memória", "placa de vídeo", "processador", "carregador", "cabo", "tablet", "echo", "alexa", "câmera", "caixa de som", "relógio"] },
  { nome: "Limpeza", chaves: ["detergente", "sabão", "amaciante", "desinfetante", "limpeza", "lava", "esponja", "água sanitária", "multiuso"] },
  { nome: "Casa", chaves: ["panela", "cama", "colchão", "sofá", "cadeira", "mesa", "geladeira", "fogão", "air fryer", "fritadeira", "liquidificador", "ventilador", "aspirador", "toalha", "lençol", "cozinha"] },
  { nome: "Beleza", chaves: ["perfume", "shampoo", "condicionador", "creme", "hidratante", "maquiagem", "batom", "barbeador", "desodorante", "protetor solar"] },
  { nome: "Moda", chaves: ["camiseta", "tênis", "camisa", "calça", "bermuda", "vestido", "jaqueta", "mochila", "bolsa", "sandália", "chinelo"] },
  { nome: "Supermercado", chaves: ["café", "arroz", "feijão", "leite", "chocolate", "biscoito", "azeite", "cerveja", "refrigerante", "snack", "whey", "suplemento"] },
];

function extrairLinks(texto) {
  return (texto.match(/https?:\/\/[^\s)>\]"']+/g) || [])
    .map((l) => l.replace(/[.,;!?]+$/, ""))
    .filter((l) => !DOMINIOS_IGNORADOS.some((d) => l.includes(d)));
}

function paraNumero(bruto) {
  let s = String(bruto).trim();
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (!/^\d+\.\d{1,2}$/.test(s)) s = s.replace(/\./g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function adivinharCategoria(titulo) {
  const t = titulo.toLowerCase();
  const achou = CATEGORIAS.find((c) => c.chaves.some((k) => t.includes(k)));
  return achou ? achou.nome : "Outros";
}

export function parseOferta(textoBruto) {
  const texto = String(textoBruto || "").replace(/\r/g, "").trim();
  if (!texto) return null;

  // Link: prefere o que vem depois de "Compre aqui"
  const idx = texto.search(/compre aqui/i);
  const links = (idx >= 0 ? extrairLinks(texto.slice(idx)) : []).concat(extrairLinks(texto));
  const link = links[0] || null;

  // Preços
  const valor = "R\\$\\s*([\\d.]+(?:,\\d{1,2})?)";
  const mPor = texto.match(new RegExp("por\\s*" + valor, "i"));
  const mDe = texto.match(new RegExp("\\bde\\s*" + valor, "i"));
  const mAntes = texto.match(new RegExp("(?:antes|era)[^R\\n]{0,10}" + valor, "i"));
  const mQualquer = texto.match(new RegExp(valor));

  const precoAtual = paraNumero((mPor || mQualquer || [])[1]);
  let precoAntigo = paraNumero(((mDe && mPor ? mDe : null) || mAntes || [])[1]);
  if (precoAntigo !== null && (precoAtual === null || precoAntigo <= precoAtual)) {
    precoAntigo = null;
  }

  // Cupom: código em MAIÚSCULAS logo depois da palavra "cupom"
  const mCupom = texto.match(/cupom[ \t]*:?[ \t]*([A-Za-z0-9_-]{3,30})/i);
  const cupom = mCupom && mCupom[1] === mCupom[1].toUpperCase() ? mCupom[1] : null;

  // Título: primeira linha com letras que não seja preço nem "Compre aqui"
  const linhas = texto
    .split("\n")
    .map((l) => l.replace(/https?:\/\/\S+/g, "").trim())
    .filter(Boolean);
  const titulo = (
    linhas.find((l) => !/^R\$/i.test(l) && !/compre aqui/i.test(l) && /\p{L}/u.test(l)) || ""
  )
    .replace(/[*_`~]/g, "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim()
    .slice(0, 200);

  if (!titulo || !link) return null;

  const loja =
    LOJAS.find((l) => l.chaves.some((c) => link.toLowerCase().includes(c)))?.nome || "Outras";

  return {
    titulo,
    precoAtual,
    precoAntigo,
    link,
    cupom,
    loja,
    categoria: adivinharCategoria(titulo),
  };
}