import { classificar } from "./classificar.mjs";

// Lê uma postagem do canal do Telegram e devolve título, preços, link, cupom, loja e categoria.
// Salve como lib/parse-oferta.js
//
// Formatos de preço reconhecidos (com ou sem emojis, negrito etc.):
//   "De R$ 299,90 por R$ 199,90"   "De: R$ 299 | Por: R$ 199"   "~R$ 299,90~ R$ 199,90" (riscado)
//   "Antes: R$ 299" / "Era R$ 299"  "R$ 299 ➡️ R$ 199"           "❌ R$ 299 ✅ R$ 199"
//   Só um preço: "R$ 199,90" (aí o preço antigo é procurado na loja)
// Parcelas ("10x de R$ 29,90"), frete e cashback são ignorados.

const DOMINIOS_IGNORADOS = ["t.me", "telegram.me", "wa.me", "chat.whatsapp.com", "whatsapp.com"];

const LOJAS = [
  { nome: "Amazon", chaves: ["amazon.", "amzn.", "amaznlink", "a.co/", "link.amazon"] },
  { nome: "Mercado Livre", chaves: ["mercadolivre", "mercadolibre", "meli.la"] },
  { nome: "Shopee", chaves: ["shopee", "shp.ee"] },
  { nome: "KaBuM!", chaves: ["kabum"] },
  { nome: "Magalu", chaves: ["magazineluiza", "magalu", "magazinevoce"] },
  { nome: "AliExpress", chaves: ["aliexpress", "s.click.ali", "a.aliexpress"] },
  { nome: "Netshoes", chaves: ["netshoes", "linksynergy"] },
];

function extrairLinks(texto) {
  return (texto.match(/https?:\/\/[^\s)>\]"']+/g) || [])
    .map((l) => l.replace(/[.,;!?*_~]+$/, ""))
    .filter((l) => !DOMINIOS_IGNORADOS.some((d) => l.includes(d)));
}

function paraNumero(bruto) {
  if (bruto === null || bruto === undefined) return null;
  let s = String(bruto).trim();
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (!/^\d+\.\d{1,2}$/.test(s)) s = s.replace(/\./g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const VALOR = "R\\$\\s*([\\d.]+(?:,\\d{1,2})?)";

// Todos os preços da postagem, com o que vem antes de cada um (para saber se é parcela, frete etc.)
function todosOsPrecos(texto) {
  const lista = [];
  const re = new RegExp(VALOR, "gi");
  let m;
  while ((m = re.exec(texto))) {
    const antes = texto.slice(Math.max(0, m.index - 25), m.index).toLowerCase();
    const depois = texto.slice(m.index + m[0].length, m.index + m[0].length + 25).toLowerCase();
    const riscado = /~\s*$/.test(antes) && /^\s*~/.test(depois);
    // ignora parcelas, frete, cashback, economia ("economize R$ 100")
    if (/\d+\s*x\s*(de\s*)?$/.test(antes.trim()) || /(frete|cashback|economi[az]e?|desconto de|off de|ganhe)\s*:?\s*$/.test(antes.trim()))
      continue;
    if (/^\s*(de\s+)?(frete|cashback)/.test(depois)) continue;
    const valor = paraNumero(m[1]);
    if (valor) lista.push({ valor, antes, riscado, pos: m.index });
  }
  return lista;
}

// Preço escrito sem "R$" ("por 14,78 à vista", "apenas 99,90"): só vale com a palavra antes e centavos
function precosSemCifrao(texto) {
  const lista = [];
  const re = /(^|[\s:])(por|apenas|s[oó]|sai por|de)\s*:?\s*(\d{1,3}(?:\.\d{3})*,\d{2})(?!\d)/gi;
  let m;
  while ((m = re.exec(texto))) {
    const valor = paraNumero(m[3]);
    if (valor) lista.push({ valor, antes: `${m[2].toLowerCase()} `, riscado: false, pos: m.index });
  }
  return lista;
}

function lerPrecos(texto) {
  let precos = todosOsPrecos(texto);
  if (!precos.length) precos = precosSemCifrao(texto);
  if (!precos.length) return { precoAtual: null, precoAntigo: null };

  const rotulado = (re) => precos.find((p) => re.test(p.antes.trim()));
  const por = rotulado(/(por|apenas|só|so|agora|hoje|sai por|saindo por|✅|🔥|💥|➡️|->|→)\s*:?\s*$/i);
  const de = rotulado(/(^|\s)(de|antes|era|preço antigo|preco antigo|❌|🚫)\s*:?\s*$/i);
  const riscado = precos.find((p) => p.riscado);

  // 1) "de X por Y" / "antes X" / riscado
  let antigo = de?.valor ?? riscado?.valor ?? null;
  let atual = por?.valor ?? null;

  // 2) Sem rótulo: o primeiro preço que não é o antigo
  if (atual === null) atual = (precos.find((p) => p.valor !== antigo) ?? precos[0]).valor;

  // 3) Dois preços sem rótulo ("R$ 299 ➡ R$ 199"): o maior que vem ANTES do menor é o antigo
  if (antigo === null && precos.length >= 2) {
    const i = precos.findIndex((p) => p.valor === atual);
    const anterior = precos.slice(0, Math.max(i, 0)).find((p) => p.valor > atual);
    if (anterior) antigo = anterior.valor;
    // atual veio primeiro e o segundo é menor: o segundo é o atual
    if (antigo === null && precos[1].valor < precos[0].valor && precos[0].valor === atual) {
      antigo = precos[0].valor;
      atual = precos[1].valor;
    }
  }

  if (antigo !== null && (atual === null || antigo <= atual)) antigo = null;
  return { precoAtual: atual, precoAntigo: antigo };
}

export function parseOferta(textoBruto) {
  const texto = String(textoBruto || "").replace(/\r/g, "").trim();
  if (!texto) return null;

  // Link: prefere o que vem depois de "Compre aqui" / "Link" / "Comprar"
  const idx = texto.search(/compre aqui|comprar|link( da oferta)?\s*:|👉|🛒/i);
  const links = (idx >= 0 ? extrairLinks(texto.slice(idx)) : []).concat(extrairLinks(texto));
  const link = links[0] || null;

  const { precoAtual, precoAntigo } = lerPrecos(texto);

  // Cupom: código em MAIÚSCULAS logo depois da palavra "cupom", na mesma linha ("com cupom: HOJEMESMO")
  // ou sozinho na linha de baixo ("R$ 71,00 com cupom:" ⏎ "HOJEMESMO", como o bot do canal posta)
  const ehCodigo = (c) => c && c === c.toUpperCase() && /[A-Z]/.test(c);
  const mCupom = texto.match(/cupom[ \t]*:?[ \t]*[*_`]*([A-Za-z0-9_-]{3,30})/i);
  const mCupomAbaixo = texto.match(/cupom[ \t]*:?[ \t]*\n[ \t]*[*_`]*([A-Z0-9_-]{3,30})[*_`]*[ \t]*(?:\n|$)/i);
  const cupom = ehCodigo(mCupom?.[1]) ? mCupom[1] : ehCodigo(mCupomAbaixo?.[1]) ? mCupomAbaixo[1] : null;

  // Título: primeira linha com letras que não seja preço, cupom nem "Compre aqui".
  // Chamadas de grupo ("Aproveite as Ofertas Imperdíveis da Netshoes!", "Corre!", "Chegou promoção")
  // são puladas quando existe outra linha que pode ser o nome do produto.
  const todasAsLinhas = texto
    .split("\n")
    .map((l) => l.replace(/https?:\/\/\S+/g, "").trim())
    .filter(Boolean);
  const CHAMADA =
    /^[^\p{L}]*(aproveite|confira|corre+|olha (s[oó]|que)|chegou|imperd[ií]ve|achadinho|s[oó] hoje|[uú]ltimas unidades|alerta de|promo(ção|ções|cao|coes)\b|oferta(s)? (imperd|do dia|especia|da semana|rel[aâ]mpago\s*!?\s*$))/iu;
  // Instruções ("adicione 3 no carrinho", "selecione Programe e Poupe") e chamadas em MAIÚSCULAS
  // ("CADA DESODORANTE POR 5 REAIS") também não são o nome do produto
  const INSTRUCAO = /^[^\p{L}]*(adicione|selecione|use o cupom|aplique|ative|resgate|clique|marque|escolha|v[aá] (em|no|na)|pague|desconto na finaliza|frete gr[aá]tis)/iu;
  const tudoMaiusculo = (l) => {
    const letras = l.replace(/[^\p{L}]/gu, "");
    return letras.length >= 8 && letras === letras.toUpperCase();
  };
  const ehChamada = (l) =>
    CHAMADA.test(l) ||
    INSTRUCAO.test(l) ||
    /ofertas? imperd[ií]ve(l|is)|aproveite (as|a|os|essa)|\bpor \d+ reais\b|^[^\p{L}]*cada .{3,40} por /iu.test(l) ||
    tudoMaiusculo(l);
  const podeSerTitulo = (l) =>
    !/^[^\p{L}]*R\$/iu.test(l) &&
    !/compre aqui|^[^\p{L}]*(de|por|antes|link)\b/iu.test(l) &&
    // linha só com o código ("Cupom: ESQUENTA") não é título; "Cupom Mercado Livre" é
    !/^[^\p{L}]*cupom[ \t]*:?[ \t]*[*_`]*[A-Z0-9_-]{3,30}[*_`]*[ \t]*$/u.test(l) &&
    !/^[^\p{L}]*cupom[ \t]*:/iu.test(l) &&
    l.replace(/[*_`]/g, "").trim() !== cupom &&
    /\p{L}{3,}/u.test(l);
  // Pula as chamadas só quando sobra outra linha que pode ser o título
  // (assim "SMART TV PHILCO 50" sozinha em maiúsculas continua sendo o título)
  const candidatas = todasAsLinhas.filter(podeSerTitulo);
  const semChamadas = candidatas.filter((l) => !ehChamada(l));
  const titulo = (
    (semChamadas.length ? semChamadas[0] : candidatas[0]) || ""
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
    categoria: classificar(titulo, loja), // null = não reconheceu ("cupons" = só um cupom)
  };
}
