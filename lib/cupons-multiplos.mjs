// Postagem com VÁRIOS cupons (ex.: "CUPONS LIBERADOS!! MERCADO LIVRE"):
//
//   🎟️ CORREPROMELI
//   12% OFF acima de R$199, máx R$300
//   Na lista: https://meli.la/2J88QHo
//   🎟️ MODASEMPREML
//   15% OFF acima de R$49, máx R$60
//   Na lista: https://meli.la/2g9xrwx
//
// Antes virava UMA oferta "sem categoria" com o título "Usa logooooo:". Agora cada cupom vira
// uma postagem separada ("Cupom Mercado Livre: 12% OFF acima de R$199, máx R$300" + "Cupom: CORREPROMELI").
// Salve como lib/cupons-multiplos.mjs. Usado por app/api/grupos/importar e lib/salvar-oferta.js.

const LINK = /https?:\/\/[^\s<>"'()\[\]]+/i;
const limparLinha = (l) =>
  String(l ?? "")
    .replace(/[\p{Extended_Pictographic}️‍]/gu, " ")
    .replace(/[*_`~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Linha que é só um código de cupom: MAIÚSCULAS/números, 4 a 30 caracteres, com pelo menos uma letra
const NAO_E_CODIGO = new Set(["MERCADO", "LIVRE", "AMAZON", "SHOPEE", "CUPOM", "CUPONS", "LIBERADOS", "OFERTA", "OFERTAS"]);
function codigoDaLinha(linha) {
  const l = limparLinha(linha).replace(/^(cupom|c[oó]digo)\s*:?\s*/i, "");
  if (!/^[A-Z0-9_-]{4,30}$/.test(l) || !/[A-Z]/.test(l) || NAO_E_CODIGO.has(l)) return null;
  return l;
}
// Linha que descreve o desconto ("12% OFF acima de R$199", "R$150 OFF acima de R$999", "Frete grátis...")
const ehDescricao = (l) => /\d+\s*%|r\$\s*\d+[\d.,]*\s*(off|de desconto)|\boff\b|desconto|frete gr[aá]tis/i.test(l) && !LINK.test(l);

// Devolve [{ codigo, descricao, link }] quando a postagem tem 2 ou mais cupons; senão null
export function separarCupons(texto) {
  const linhas = String(texto ?? "").replace(/\r/g, "").split("\n");
  const cupons = [];
  for (let i = 0; i < linhas.length; i++) {
    const codigo = codigoDaLinha(linhas[i]);
    if (!codigo) continue;
    let descricao = null;
    let link = null;
    // procura a descrição e o link nas próximas linhas, até o próximo código
    for (let j = i + 1; j < Math.min(linhas.length, i + 5); j++) {
      if (codigoDaLinha(linhas[j])) break;
      const l = limparLinha(linhas[j]);
      if (!l) continue;
      const achado = linhas[j].match(LINK);
      if (achado && !link) link = achado[0].replace(/[.,;:!?*_~]+$/, "");
      else if (!descricao && ehDescricao(l)) descricao = l;
    }
    if (link && !/^https?:\/\/(t\.me|telegram\.me|chat\.whatsapp\.com)\//i.test(link)) cupons.push({ codigo, descricao, link });
  }
  // sem repetir o mesmo código
  const unicos = cupons.filter((c, i) => cupons.findIndex((x) => x.codigo === c.codigo) === i);
  return unicos.length >= 2 ? unicos : null;
}

// Nome da loja para o título, pelo texto da postagem ou pelo link
export function lojaDosCupons(texto) {
  const t = String(texto ?? "");
  if (/mercado\s*livre|mercadolivre|meli\.la/i.test(t)) return "Mercado Livre";
  if (/amazon|amzn\./i.test(t)) return "Amazon";
  if (/shopee|shp\.ee/i.test(t)) return "Shopee";
  if (/kabum/i.test(t)) return "KaBuM!";
  if (/magalu|magazine\s*luiza/i.test(t)) return "Magalu";
  if (/aliexpress/i.test(t)) return "AliExpress";
  return "";
}

// Texto de UMA postagem de cupom (o parse-oferta entende: título "Cupom ...", "Cupom: CODIGO", link)
export function textoDoCupom(cupom, { loja = "", link = cupom.link } = {}) {
  const titulo = `Cupom ${loja || "de desconto"}${cupom.descricao ? `: ${cupom.descricao}` : ""}`;
  return `${titulo}\nCupom: ${cupom.codigo}\n${link}`;
}
