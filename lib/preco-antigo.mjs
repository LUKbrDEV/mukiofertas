// Tenta descobrir o preço "antes" que a própria loja mostra na página do produto.
// Se não conseguir (loja bloqueou, página mudou, não existe preço riscado),
// devolve null e a oferta simplesmente fica sem desconto.

const TEMPO_LIMITE_MS = 5000;

function paraNumero(texto) {
  // "1.299,90" -> 1299.9
  const n = parseFloat(String(texto).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Amazon: o preço riscado fica numa tag "a-text-price" / data-a-strike
function precoDaAmazon(html) {
  const padroes = [
    /data-a-strike="true"[^>]*>\s*<span[^>]*class="a-offscreen"[^>]*>\s*R\$\s*([\d.]+,\d{2})/i,
    /class="a-price a-text-price[^"]*"[^>]*>\s*<span[^>]*class="a-offscreen"[^>]*>\s*R\$\s*([\d.]+,\d{2})/i,
  ];
  for (const padrao of padroes) {
    const m = html.match(padrao);
    if (m) return paraNumero(m[1]);
  }
  return null;
}

// Mercado Livre: o preço antigo vem com o texto "Antes: 1299 reais com 90 centavos"
function precoDoMercadoLivre(html) {
  const tag = html.match(/<[^>]*andes-money-amount--previous[^>]*>/i);
  if (!tag) return null;
  const m = tag[0].match(/aria-label="Antes:\s*([\d.]+)\s*reais(?:\s*com\s*(\d+)\s*centavos)?/i);
  if (!m) return null;
  return Number(m[1].replace(/\./g, "")) + (m[2] ? Number(m[2]) / 100 : 0);
}

// Segurança: só aceita se for maior que o preço atual e o desconto for plausível (5% a 80%)
function plausivel(antigo, atual) {
  if (!antigo || !atual || antigo <= atual) return false;
  const desconto = (antigo - atual) / antigo;
  return desconto >= 0.05 && desconto <= 0.8;
}

export async function buscarPrecoAntigo(link, precoAtual) {
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
    const destino = resposta.url.toLowerCase(); // endereço final, depois dos redirecionamentos

    let antigo = null;
    if (destino.includes("amazon.")) antigo = precoDaAmazon(html);
    else if (destino.includes("mercadolivre") || destino.includes("mercadolibre")) {
      antigo = precoDoMercadoLivre(html);
    }

    return plausivel(antigo, precoAtual) ? antigo : null;
  } catch {
    return null; // qualquer falha: segue sem preço antigo
  } finally {
    clearTimeout(timer);
  }
}