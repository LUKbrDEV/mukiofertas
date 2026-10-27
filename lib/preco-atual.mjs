// Tenta ler o preço ATUAL que a loja mostra na página do produto.
// Se não conseguir (loja bloqueou, página mudou, link de afiliado que não abre o produto),
// devolve null e nada é alterado na oferta.

const TEMPO_LIMITE_MS = 6000;

function paraNumero(texto) {
  // "1.299,90" -> 1299.9
  const n = parseFloat(String(texto).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Mercado Livre: o preço vem em <meta itemprop="price" content="1299.9"> ou nos dados da página
function precoDoMercadoLivre(html) {
  const meta =
    html.match(/<meta[^>]*itemprop="price"[^>]*content="([\d.]+)"/i) ||
    html.match(/<meta[^>]*content="([\d.]+)"[^>]*itemprop="price"/i);
  if (meta) return Number(meta[1]);

  const json = html.match(/"@type"\s*:\s*"Offer"[^}]*?"price"\s*:\s*"?([\d.]+)"?/i);
  if (json) return Number(json[1]);
  return null;
}

// Amazon: o preço de compra fica em "priceToPay" / a-price (sem ser o preço riscado)
function precoDaAmazon(html) {
  const principal = html.match(
    /priceToPay[\s\S]{0,500}?<span class="a-offscreen">\s*R\$\s*([\d.]+,\d{2})/i
  );
  if (principal) return paraNumero(principal[1]);

  const generico = html.match(
    /<span class="a-price(?![^"]*a-text-price)[^"]*"[^>]*>\s*<span class="a-offscreen">\s*R\$\s*([\d.]+,\d{2})/i
  );
  return generico ? paraNumero(generico[1]) : null;
}

export async function buscarPrecoAtual(link, precoReferencia) {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(link, {
      redirect: "follow",
      signal: controle.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });
    if (!resposta.ok) return null;

    const html = await resposta.text();
    const destino = resposta.url.toLowerCase();

    let preco = null;
    if (destino.includes("amazon.")) preco = precoDaAmazon(html);
    else if (destino.includes("mercadolivre") || destino.includes("mercadolibre")) {
      preco = precoDoMercadoLivre(html);
    }

    // Segurança: descarta leituras absurdas (entre 30% e 300% do preço de referência)
    const ref = Number(precoReferencia);
    if (!preco || !ref || preco < ref * 0.3 || preco > ref * 3) return null;
    return preco;
  } catch {
    return null; // qualquer falha: não altera nada
  } finally {
    clearTimeout(timer);
  }
}