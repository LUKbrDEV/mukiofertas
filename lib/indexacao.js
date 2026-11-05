// Quais páginas de oferta o Google deve indexar.
// Salve como lib/indexacao.js. É usado pela página da oferta (noindex) e pelo sitemap.
//
// Para o AdSense, centenas de páginas quase iguais (só título, preço e link) contam como
// "conteúdo de baixo valor". Por isso, só entram no Google as ofertas no ar que têm
// detalhes próprios (seção "Sobre o produto" ou "Especificações"). As outras continuam
// abertas para quem clica, mas ficam fora da busca.
//
// Depois que o site for aprovado no AdSense, se quiser indexar todas as ofertas no ar,
// troque para false.
export const SO_INDEXAR_OFERTAS_COM_DETALHES = true;

export function temDetalhes(oferta) {
  const sobre = Array.isArray(oferta?.sobre) ? oferta.sobre.filter(Boolean) : [];
  const especificacoes = Array.isArray(oferta?.especificacoes)
    ? oferta.especificacoes.filter((e) => e?.nome && e?.valor)
    : [];
  return sobre.length > 0 || especificacoes.length > 0;
}

// "expirada" já vem calculada (lib/ofertas.js → estaExpirada)
export function deveIndexarOferta(oferta, expirada) {
  if (!oferta || expirada) return false;
  if (!SO_INDEXAR_OFERTAS_COM_DETALHES) return true;
  return temDetalhes(oferta);
}
