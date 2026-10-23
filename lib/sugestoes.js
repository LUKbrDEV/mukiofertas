// Validação das promoções enviadas pela comunidade (roda no servidor).

const limpar = (valor, max) =>
  String(valor ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

// Aceita "1.299,90" e também "1299.90"
function numero(valor) {
  const texto = String(valor ?? "").trim();
  if (!texto) return NaN;
  return Number(texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto);
}

export function validarSugestao(corpo, categoriasValidas) {
  const usuario = limpar(corpo.usuario, 30);
  const email = limpar(corpo.email, 120).toLowerCase();
  const titulo = limpar(corpo.titulo, 200);
  const loja = limpar(corpo.loja, 60);
  const categoria = String(corpo.categoria ?? "");
  const cupom = limpar(corpo.cupom, 30) || null;
  const atual = numero(corpo.preco_atual);
  const antigoTexto = limpar(corpo.preco_antigo, 20);
  const antigo = antigoTexto ? numero(antigoTexto) : null;
  const linkTexto = limpar(corpo.link, 500);

  if (!/^[\p{L}\p{N}_.\- ]{2,30}$/u.test(usuario))
    return { erro: "Informe um nome de usuário com 2 a 30 caracteres (letras, números, espaço, _ . -)." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { erro: "Informe um e-mail válido." };
  if (titulo.length < 4) return { erro: "Informe o título da promoção." };
  if (loja.length < 2) return { erro: "Informe a loja." };
  if (!categoriasValidas.includes(categoria)) return { erro: "Escolha uma categoria." };
  if (!(atual > 0) || atual > 1000000) return { erro: "Informe o preço atual (por exemplo, 199,90)." };
  if (antigo !== null && !(antigo > atual)) return { erro: "O preço antigo precisa ser maior que o preço atual." };

  let url;
  try {
    url = new URL(linkTexto);
  } catch {
    return { erro: "Informe o link da promoção, começando com https://" };
  }
  const host = url.hostname;
  if (!["http:", "https:"].includes(url.protocol) || !host.includes(".") || /^\d+(\.\d+){3}$/.test(host))
    return { erro: "O link precisa ser o endereço de uma loja (começando com https://)." };

  if (!corpo.aceite) return { erro: "É preciso concordar com o uso dos dados para enviar." };

  return {
    dados: {
      usuario,
      email,
      titulo,
      loja,
      categoria,
      preco_atual: atual,
      preco_antigo: antigo,
      link: url.href,
      cupom,
    },
  };
}
