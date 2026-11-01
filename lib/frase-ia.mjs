// Frase engraçada para cada oferta enviada ao WhatsApp (campo {frase} do modelo).
// Salve como lib/frase-ia.mjs. Usado pelo scripts/postar-whatsapp.mjs.
//
// 1) Gemini (IA do Google): cria uma frase nova para cada produto
// 2) Se a IA não estiver configurada, falhar ou passar do limite grátis: sorteia uma frase do banco abaixo
//
// Variável (no .env.local e nos Secrets do GitHub):
//   GEMINI_API_KEY   chave grátis em https://aistudio.google.com/apikey
//   GEMINI_MODELO    (opcional) modelo a usar; sem ela o robô tenta os da lista MODELOS, em ordem

const MODELOS = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash"];
const TAMANHO_MAXIMO = 110; // caracteres

export const ESTILO_PADRAO =
  "engraçada e leve, no estilo de meme brasileiro de grupo de promoções, sem palavrão, sem ofender ninguém";

// ---------- Banco de frases (reserva) ----------
// {desconto} e {loja} são trocados pelos dados da oferta. Pode acrescentar frases à vontade.
const BANCO = {
  hardware: [
    "Seu PC pediu socorro e a gente ouviu 🖥️",
    "Upgrade no setup, downgrade no preço 📉",
    "Mais FPS, menos desculpa pra perder a partida 🎮",
    "Seu gabinete vai agradecer (e a carteira também) 🙏",
    "Quem monta PC sabe: oportunidade assim não volta 🔧",
  ],
  games: [
    "Prepara o sofá que a jogatina vai ser longa 🎮",
    "Seu controle já tá até tremendo de emoção 🕹️",
    "Game over pro preço alto 💥",
    "Avisa a família que você vai sumir no fim de semana 😅",
  ],
  telas: [
    "Mais polegadas, menos desculpas 📺",
    "Sua série favorita merece essa tela 🍿",
    "Os olhos agradecem, o bolso também 👀",
    "Tela nova, vida nova 😎",
  ],
  celulares: [
    "Seu celular atual já pode ir arrumando as malas 📱",
    "Bateria de 2% nunca mais (talvez) 🔋",
    "Upgrade de bolso com preço de bolso 🤳",
  ],
  casa: [
    "Sua casa merece esse carinho 🏠",
    "Organização é amor, e esse preço também 🧡",
    "A cozinha vai ficar chique e o bolso feliz 🍳",
    "Mãe aprovaria essa compra 👩‍🍳",
  ],
  beleza: [
    "Autoestima em promoção, aproveita 💅",
    "Ficar bonito(a) nunca foi tão barato ✨",
    "Glow up com desconto é outro nível 💄",
  ],
  moda: [
    "Look novo, preço de look velho 👕",
    "O espelho vai pedir pra você sair mais 😎",
    "Estilo não tem preço, mas esse tá baratinho 🛍️",
  ],
  infantil: [
    "A criançada vai pirar 🧸",
    "Presente certeiro, preço mais ainda 🎁",
    "Pai e mãe também merecem economizar 😅",
  ],
  mercado: [
    "Despensa cheia, carteira tranquila 🛒",
    "Abastece aí que tá barato 😋",
    "Mercado com desconto é felicidade comprovada 🧺",
  ],
  pet: [
    "Seu pet mandou avisar: é pra comprar 🐶",
    "O rabinho vai balançar com essa 🐾",
    "Mimo pro bichinho com preço camarada 🐱",
  ],
  cupons: [
    "Cupom bom é cupom usado 🎟️",
    "Copia, cola e economiza 💸",
    "Esse código vale mais que muito conselho 😉",
  ],
  geral: [
    "{desconto} OFF? Isso não é promoção, é sequestro de preço 🚨",
    "Corre que é por tempo limitado ⏰",
    "Quem viu, viu. Quem não viu, vai chorar depois 😭",
    "Seu eu do futuro agradece essa economia 🙌",
    "Preço desses some mais rápido que salário 💸",
    "Achado do dia, só não conta pra todo mundo 🤫",
  ],
};

const GRUPO_DA_CATEGORIA = {
  hardware: "hardware", processadores: "hardware", "placa-mae": "hardware", ssd: "hardware",
  "placa-de-video": "hardware", "memoria-ram": "hardware", gabinete: "hardware", perifericos: "hardware",
  computadores: "hardware", redes: "hardware", "cadeiras-mesas": "hardware",
  games: "games", consoles: "games", controles: "games", jogos: "games",
  monitores: "telas", monitor: "telas", tv: "telas", televisores: "telas", "acessorios-tv": "telas",
  "acessorios-monitor": "telas", notebooks: "telas", notebook: "telas", tablets: "telas",
  smartphones: "celulares", celulares: "celulares", "acessorios-celular": "celulares",
  casa: "casa", "cama-banho": "casa", limpeza: "casa", "casa-inteligente": "casa", "ar-condicionado": "casa",
  ferramentas: "casa",
  beleza: "beleza", perfumaria: "beleza",
  moda: "moda", "moda-masculina": "moda", "moda-feminina": "moda", sapatos: "moda", mochilas: "moda",
  brinquedos: "infantil", "moda-infantil": "infantil",
  mercado: "mercado", pet: "pet", cupons: "cupons",
};

const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];

export function fraseDoBanco(oferta, campos = {}) {
  const grupo = GRUPO_DA_CATEGORIA[oferta.categoria];
  // metade das vezes usa as frases gerais, para variar mais
  let lista = grupo && Math.random() < 0.6 ? BANCO[grupo] : BANCO.geral;
  if (!campos.desconto) lista = lista.filter((f) => !f.includes("{desconto}"));
  if (!lista.length) lista = BANCO.geral.filter((f) => !f.includes("{desconto}"));
  return sortear(lista)
    .replace("{desconto}", campos.desconto ?? "")
    .replace("{loja}", campos.loja ?? "");
}

// ---------- Gemini ----------
let modeloQueFunciona = null; // guarda o primeiro modelo que respondeu, nesta execução
let iaDesligada = false; // depois de erro de limite/chave, não tenta de novo nesta execução

function limpar(texto) {
  return String(texto ?? "")
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean)
    ?.replace(/^["'“”«»\-–•*\s]+|["'“”«»\s]+$/g, "")
    .replace(/\*/g, "") // o WhatsApp usaria como negrito
    .slice(0, TAMANHO_MAXIMO)
    .trim();
}

async function chamarGemini(modelo, prompt) {
  const corpo = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 1.1,
      maxOutputTokens: 80,
      // os modelos 2.5 "pensam" antes de responder; para uma frase curta não precisa
      ...(modelo.includes("2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(20000),
  });
  const json = await r.json().catch(() => null);
  if (!r.ok) {
    const erro = new Error(`Gemini ${modelo} -> ${r.status} ${json?.error?.message ?? ""}`.slice(0, 200));
    erro.status = r.status;
    throw erro;
  }
  return json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
}

function montarPrompt(oferta, campos, estilo) {
  return [
    "Você escreve frases curtas para um grupo de WhatsApp de promoções no Brasil (MukiOfertas).",
    `Escreva UMA frase ${estilo || ESTILO_PADRAO}, sobre o produto abaixo.`,
    `Regras: no máximo ${TAMANHO_MAXIMO - 20} caracteres; no máximo 1 emoji; sem hashtags; sem aspas;`,
    "não invente preço, desconto, característica ou prazo que não estejam abaixo; não repita o nome inteiro do produto;",
    "responda só com a frase, sem explicação.",
    "",
    oferta.categoria === "cupons" ? `Cupom de desconto: ${campos.titulo}` : `Produto: ${campos.titulo}`,
    campos.loja ? `Loja: ${campos.loja}` : "",
    campos.preco ? `Preço: ${campos.preco}` : "",
    campos.desconto ? `Desconto: ${campos.desconto}` : "",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

// Devolve { frase, origem: "ia" | "banco" }
export async function gerarFrase(oferta, campos, { estilo, usarIa = true } = {}) {
  if (usarIa && process.env.GEMINI_API_KEY && !iaDesligada) {
    const modelos = process.env.GEMINI_MODELO ? [process.env.GEMINI_MODELO] : modeloQueFunciona ? [modeloQueFunciona] : MODELOS;
    for (const modelo of modelos) {
      try {
        const frase = limpar(await chamarGemini(modelo, montarPrompt(oferta, campos, estilo)));
        if (frase && frase.length >= 8) {
          modeloQueFunciona = modelo;
          return { frase, origem: "ia" };
        }
      } catch (e) {
        // modelo que não existe mais: tenta o próximo; limite ou chave errada: usa o banco
        if (e.status === 404 || e.status === 400) continue;
        if (e.status === 429 || e.status === 401 || e.status === 403) iaDesligada = true;
        console.warn(`  [frase] ${e.message}; usando uma frase do banco`);
        break;
      }
    }
  }
  return { frase: fraseDoBanco(oferta, campos), origem: "banco" };
}
