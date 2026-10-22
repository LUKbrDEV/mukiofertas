// Transforma uma mensagem do Telegram (do bot que posta no canal) em uma oferta do site.
// Formato esperado, por exemplo:
//
//   Celular Samsung Galaxy A17 5G, 128GB - Cinza
//
//   R$ 899,10                      (ou: R$ 1.885,00 com cupom: / CODIGO)
//
//   Compre aqui: https://meli.la/xxxx

const sem_acento = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Palavras (sem acento) que indicam cada categoria. Vence a que tiver mais acertos.
const PALAVRAS = {
  tecnologia: [
    "celular", "smartphone", "galaxy", "iphone", "xiaomi", "motorola", "notebook", "tv", "smart tv",
    "4k", "webos", "alexa", "fone", "monitor", "tablet", "ssd", "mouse", "teclado", "caixa de som",
    "smartwatch", "carregador", "camera", "impressora", "roteador", "wifi", "bluetooth", "gb",
    "processador", "placa de video", "kindle", "echo",
  ],
  games: [
    "gamer", "console", "playstation", "ps5", "ps4", "xbox", "nintendo", "switch", "joystick",
    "headset", "jogo",
  ],
  limpeza: [
    "detergente", "sabao", "desinfetante", "amaciante", "agua sanitaria", "limpeza", "lava roupa",
    "lava loucas", "esponja", "multiuso", "alvejante",
  ],
  casa: [
    "air fryer", "fritadeira", "panela", "liquidificador", "cafeteira", "aspirador", "ventilador",
    "geladeira", "fogao", "microondas", "cama", "travesseiro", "ar condicionado", "lavadora",
    "cozinha", "sofa", "colchao", "batedeira", "airfryer",
  ],
};

export function classificar(titulo) {
  const t = sem_acento(titulo);
  let melhor = "outros";
  let pontos = 0;
  for (const [categoria, palavras] of Object.entries(PALAVRAS)) {
    const acertos = palavras.filter((p) => new RegExp(`\\b${p}`).test(t)).length;
    if (acertos > pontos) {
      melhor = categoria;
      pontos = acertos;
    }
  }
  return melhor;
}

const LOJAS = [
  [/amaznlink|amzn\.|amazon\./i, "Amazon"],
  [/meli\.la|mercadolivre|mercadolibre/i, "Mercado Livre"],
  [/shopee|shp\.ee/i, "Shopee"],
  [/magalu|magazineluiza/i, "Magalu"],
  [/kabum/i, "KaBuM!"],
  [/aliexpress/i, "AliExpress"],
];

export function detectarLoja(url) {
  for (const [padrao, nome] of LOJAS) if (padrao.test(url)) return nome;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Loja parceira";
  }
}

const numeroBR = (texto) => Number(texto.replace(/\./g, "").replace(",", "."));

// Devolve { oferta } ou { motivo } (quando a mensagem não é uma oferta).
export function interpretarMensagem(msg) {
  const texto = msg.text ?? msg.caption ?? "";
  const entidades = msg.entities ?? msg.caption_entities ?? [];

  if (!texto.trim()) return { motivo: "sem texto" };
  if (texto.includes("Link de afiliado. Preço e estoque")) return { motivo: "postagem do próprio robô" };

  // Link: prefere o link escondido em um texto ("Compre aqui"); senão, o primeiro endereço do texto
  const linkEscondido = entidades.find((e) => e.type === "text_link")?.url;
  const linkNoTexto = texto.match(/https?:\/\/[^\s<>"')]+/i)?.[0];
  const link = (linkEscondido ?? linkNoTexto ?? "").replace(/[.,;:!?]+$/, "");
  if (!/^https?:\/\//i.test(link)) return { motivo: "sem link" };

  // Preço: "de R$ X por R$ Y" ou o primeiro "R$ Y"
  const dePor = texto.match(/\bde\s+R\$\s*(\d[\d.]*(?:,\d{1,2})?)[\s\S]{0,40}?\bpor\s+R\$\s*(\d[\d.]*(?:,\d{1,2})?)/i);
  let atual;
  let antigo = null;
  if (dePor) {
    antigo = numeroBR(dePor[1]);
    atual = numeroBR(dePor[2]);
  } else {
    const preco = texto.match(/R\$\s*(\d[\d.]*(?:,\d{1,2})?)/);
    if (!preco) return { motivo: "sem preço" };
    atual = numeroBR(preco[1]);
  }
  if (!(atual > 0)) return { motivo: "preço inválido" };
  if (antigo !== null && !(antigo > atual)) antigo = null;

  // Cupom: trecho em formato de código (monoespaçado) ou o texto depois de "cupom:"
  const codigo = entidades.find((e) => e.type === "code" || e.type === "pre");
  let cupom = codigo ? texto.slice(codigo.offset, codigo.offset + codigo.length) : null;
  if (!cupom) cupom = texto.match(/(?:cupom|Cupom|CUPOM)\s*:?\s*`?([A-Z0-9_-]{4,30})`?/)?.[1] ?? null;
  cupom = cupom ? cupom.replace(/`/g, "").trim().slice(0, 30) || null : null;

  // Título: primeira linha que não seja preço, link ou "compre aqui"
  const linhas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const linhaTitulo = linhas.find(
    (l) => !/^R\$/.test(l) && !/^(compre|link|cupom)/i.test(l) && !/^https?:/i.test(l) && l !== cupom
  );
  const titulo = (linhaTitulo ?? "").replace(/R\$.*/, "").replace(/`/g, "").trim().slice(0, 200);
  if (titulo.length < 4) return { motivo: "sem título" };

  const loja = detectarLoja(link);
  return {
    oferta: {
      loja,
      id_externo: `tg-${msg.chat.id}-${msg.message_id}`,
      titulo,
      categoria: classificar(titulo),
      preco_atual: atual,
      preco_antigo: antigo,
      link,
      cupom,
    },
    fotoId: msg.photo?.at(-1)?.file_id ?? null,
  };
}
