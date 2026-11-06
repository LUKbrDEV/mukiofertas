// Converte links da Magalu para a SUA loja do Influenciador Magalu (comissão sua).
// Salve como lib/afiliado-magalu.mjs
//
//   https://www.magazineluiza.com.br/produto/p/abc123/ud/cesr/
//   vira
//   https://www.magazinevoce.com.br/magazinemukiofertas/produto/p/abc123/ud/cesr/
//
// Também troca o link da loja de OUTRO influenciador (magazinevoce.com.br/magazineOUTRO/...) pela sua.
// Links curtos do app (magazineluiza.onelink.me/...) não dão para converter: use o link normal do produto.

export const LOJA_MAGALU = "magazinemukiofertas"; // o nome da sua loja no Influenciador Magalu

export function converterLinkMagalu(link) {
  let url;
  try {
    url = new URL(String(link || "").trim());
  } catch {
    return link;
  }
  const host = url.hostname.toLowerCase();

  // Site normal da Magalu (www, m., sem www)
  if (/(^|\.)magazineluiza\.com\.br$/.test(host) && !/onelink/.test(host)) {
    return `https://www.magazinevoce.com.br/${LOJA_MAGALU}${url.pathname}${url.search}`;
  }

  // Loja de outro influenciador: troca o nome da loja pelo seu
  if (/(^|\.)magazinevoce\.com\.br$/.test(host)) {
    const partes = url.pathname.split("/");
    if (partes[1] && partes[1].toLowerCase() !== LOJA_MAGALU) {
      partes[1] = LOJA_MAGALU;
      return `https://www.magazinevoce.com.br${partes.join("/")}${url.search}`;
    }
  }
  return link;
}

export const ehLinkMagalu = (link) => /magazineluiza|magazinevoce|magalu/i.test(String(link || ""));
