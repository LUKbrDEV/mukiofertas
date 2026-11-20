// Filtros de título das ofertas (usados pelo lib/salvar-oferta.js e pelo
// scripts/corrigir-amazon-e-titulos.mjs).

// Frase de chamada em vez do nome do produto: quase tudo em MAIÚSCULAS ou gírias de grupo
export function pareceChamada(titulo) {
  const t = String(titulo ?? "").trim();
  const letras = t.replace(/[^\p{L}]/gu, "");
  const maiusculas = letras.replace(/[^\p{Lu}]/gu, "").length;
  if (letras.length >= 10 && maiusculas / letras.length > 0.7) return true;
  return /\b(conto|contos|te falar|bem avaliad[oa]|t[aá] barato|corre+|galera|olha s[oó]|achadinho|imperd[ií]vel|pra casa|baratinho|vale muito|pre[cç]o de banana)\b/iu.test(t);
}

// Título que não é nome de produto ("até o miojo", "só tá lavando com o sabonete errado").
// Nome de produto começa com maiúscula ou número (exceções: iPhone, iPad, eFootball...)
// e não fala com o leitor. Essas ofertas não entram no site: a Amazon recusou a conta
// por conteúdo assim.
export function tituloRuim(titulo) {
  const t = String(titulo ?? "").trim();
  if (t.replace(/[^\p{L}]/gu, "").length < 6) return true; // curto demais
  const inicio = t.replace(/^[^\p{L}\d]+/u, "");
  const marcaMinuscula = /^[a-z][A-Z]/.test(inicio); // iPhone, iPad, eFootball
  if (!marcaMinuscula && /^\p{Ll}/u.test(inicio)) return true; // começa com minúscula: frase solta
  if (pareceChamada(t)) return true;
  return /(^|\s)(t[aá] lavando|voc[eê] (t[aá]|precisa|vai)|s[oó] t[aá]|t[oô] (usando|chocad)|gente|mano|vc|olha isso|quem (a[ií]|tem|precisa))(\s|$|[!?.,])/iu.test(t);
}
