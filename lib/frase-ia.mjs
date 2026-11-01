// Frase engraçada para cada oferta enviada ao WhatsApp (campo {frase} do modelo).
// Salve como lib/frase-ia.mjs. Usado pelo scripts/postar-whatsapp.mjs.
//
// 1) Gemini (IA do Google): cria uma frase nova para cada produto
// 2) Se a IA não estiver configurada, falhar ou passar do limite grátis: sorteia uma frase do banco abaixo
//
// Variável (no .env.local e nos Secrets do GitHub):
//   GEMINI_API_KEY   chave grátis em https://aistudio.google.com/apikey
//   GEMINI_MODELO    (opcional) modelo a usar; sem ela o robô tenta os da lista MODELOS, em ordem

// O Google aposenta modelos com frequência. Em vez de uma lista fixa, o robô pergunta à API
// quais modelos existem e escolhe o "flash" mais novo (prefere o "flash-lite", mais rápido e com mais
// cota grátis). Para forçar um modelo, use a variável GEMINI_MODELO (ex.: gemini-3.8-flash).
let modelosDisponiveis = null;
async function descobrirModelos() {
  if (modelosDisponiveis) return modelosDisponiveis;
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY },
      signal: AbortSignal.timeout(15000),
    });
    const json = await r.json().catch(() => null);
    if (!r.ok) throw new Error(`lista de modelos -> ${r.status} ${json?.error?.message ?? ""}`);
    const versao = (nome) => Number((nome.match(/gemini-(\d+(?:\.\d+)?)/) ?? [])[1] ?? 0);
    const nomes = (json?.models ?? [])
      .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m) => String(m.name).replace(/^models\//, ""))
      .filter((n) => /^gemini-.*flash/.test(n))
      .filter((n) => !/(image|tts|audio|live|embedding|thinking|exp)/.test(n));
    // estáveis antes de preview; depois os "lite" (mais rápidos, menos disputados); depois o mais novo
    nomes.sort(
      (a, b) =>
        Number(a.includes("preview")) - Number(b.includes("preview")) ||
        Number(b.includes("lite")) - Number(a.includes("lite")) ||
        versao(b) - versao(a)
    );
    modelosDisponiveis = nomes.slice(0, 6);
    if (modelosDisponiveis.length) console.log(`  [frase] modelos do Gemini: ${modelosDisponiveis.join(", ")}`);
  } catch (e) {
    console.warn(`  [frase] não consegui listar os modelos do Gemini (${e.message})`);
    modelosDisponiveis = [];
  }
  return modelosDisponiveis;
}
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
    "O setup dos sonhos acabou de ficar mais perto 🚀",
    "Seu PC vai até ligar mais rápido de felicidade ⚡",
    "Aquele upgrade que você vive adiando? Chegou a hora 🛠️",
    "RGB não deixa o PC mais rápido, mas esse preço deixa feliz 🌈",
    "Hardware bom e barato: a combinação mais rara da internet 🦄",
  ],
  games: [
    "Prepara o sofá que a jogatina vai ser longa 🎮",
    "Seu controle já tá até tremendo de emoção 🕹️",
    "Game over pro preço alto 💥",
    "Avisa a família que você vai sumir no fim de semana 😅",
    "Achievement desbloqueado: economizar dinheiro 🏆",
    "Respawn no preço: voltou mais barato 🔁",
    "Modo campanha: comprar antes que acabe 🎯",
  ],
  telas: [
    "Mais polegadas, menos desculpas 📺",
    "Sua série favorita merece essa tela 🍿",
    "Os olhos agradecem, o bolso também 👀",
    "Tela nova, vida nova 😎",
    "Maratona de série nunca mais vai ser a mesma 📺",
    "Cada pixel valendo cada centavo 🖼️",
    "A sala vai virar cinema e o bolso agradece 🎬",
  ],
  celulares: [
    "Seu celular atual já pode ir arrumando as malas 📱",
    "Bateria de 2% nunca mais (talvez) 🔋",
    "Upgrade de bolso com preço de bolso 🤳",
    "Aquele celular travando já pode se aposentar 👋",
    "Foto boa, preço melhor ainda 📸",
    "Seu story vai ficar outro nível 🤩",
  ],
  casa: [
    "Sua casa merece esse carinho 🏠",
    "Organização é amor, e esse preço também 🧡",
    "A cozinha vai ficar chique e o bolso feliz 🍳",
    "Mãe aprovaria essa compra 👩‍🍳",
    "A casa agradece, o bolso também 🏡",
    "Praticidade que cabe no orçamento ✅",
    "Daquelas compras que a gente se pergunta como vivia sem 🤔",
  ],
  beleza: [
    "Autoestima em promoção, aproveita 💅",
    "Ficar bonito(a) nunca foi tão barato ✨",
    "Glow up com desconto é outro nível 💄",
    "Se cuidar ficou mais barato hoje 🧴",
    "O espelho já está agradecendo 🪞",
  ],
  moda: [
    "Look novo, preço de look velho 👕",
    "O espelho vai pedir pra você sair mais 😎",
    "Estilo não tem preço, mas esse tá baratinho 🛍️",
    "Armário renovado sem drama 👟",
    "Chega de dizer que não tem roupa 😅",
  ],
  infantil: [
    "A criançada vai pirar 🧸",
    "Presente certeiro, preço mais ainda 🎁",
    "Pai e mãe também merecem economizar 😅",
    "Diversão garantida, carteira preservada 🎈",
  ],
  mercado: [
    "Despensa cheia, carteira tranquila 🛒",
    "Abastece aí que tá barato 😋",
    "Mercado com desconto é felicidade comprovada 🧺",
    "Estoque em casa, dinheiro no bolso 🥫",
  ],
  pet: [
    "Seu pet mandou avisar: é pra comprar 🐶",
    "O rabinho vai balançar com essa 🐾",
    "Mimo pro bichinho com preço camarada 🐱",
    "Quem é o pet mais mimado? O seu, a partir de hoje 🦴",
  ],
  cupons: [
    "Cupom bom é cupom usado 🎟️",
    "Copia, cola e economiza 💸",
    "Esse código vale mais que muito conselho 😉",
    "Código na mão, desconto no carrinho 🛒",
    "Um copiar e colar que vale dinheiro 💰",
  ],
  geral: [
    "{desconto} OFF? Isso não é promoção, é sequestro de preço 🚨",
    "Corre que é por tempo limitado ⏰",
    "Quem viu, viu. Quem não viu, vai chorar depois 😭",
    "Seu eu do futuro agradece essa economia 🙌",
    "Preço desses some mais rápido que salário 💸",
    "Achado do dia, só não conta pra todo mundo 🤫",
    "Seu carrinho estava esperando por isso 🛒",
    "Promoção boa não espera, já dizia o ditado 📢",
    "Melhor que achar dinheiro no bolso da calça 💵",
    "Tá barato? Tá. Vai deixar passar? 👀",
    "Isso aqui é pra quem chega primeiro 🏃",
    "O boleto chora, mas essa promoção sorri 😄",
    "Desconto desses é raro igual Wi-Fi bom em viagem 📶",
    "Seu bolso pediu e a gente atendeu 🙏",
    "Pode comprar sem culpa, a gente deixa 😌",
    "Economia que dá até vontade de contar pros amigos 📲",
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

const preencherFrase = (f, campos) => f.replace("{desconto}", campos.desconto ?? "").replace("{loja}", campos.loja ?? "");

export function fraseDoBanco(oferta, campos = {}, recentes = []) {
  const grupo = GRUPO_DA_CATEGORIA[oferta.categoria];
  const usadas = new Set(recentes.map(normalizar));
  const servem = (lista) =>
    (lista ?? [])
      .filter((f) => campos.desconto || !f.includes("{desconto}"))
      .filter((f) => !usadas.has(normalizar(preencherFrase(f, campos))));
  // frases da categoria + gerais, sem as que foram usadas nas últimas mensagens
  let lista = [...servem(BANCO[grupo]), ...servem(BANCO.geral)];
  if (!lista.length) lista = (BANCO[grupo] ?? BANCO.geral).filter((f) => campos.desconto || !f.includes("{desconto}"));
  return preencherFrase(sortear(lista), campos);
}

// ---------- Parecida com uma frase recente? ----------
const normalizar = (t) =>
  String(t ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const PALAVRAS_VAZIAS = new Set(["a", "o", "e", "de", "da", "do", "que", "pra", "para", "com", "no", "na", "um", "uma", "seu", "sua", "é", "e", "mais", "esse", "essa", "isso"]);
function palavras(t) {
  return new Set(normalizar(t).split(" ").filter((p) => p.length > 2 && !PALAVRAS_VAZIAS.has(p)));
}
export function parecidaComRecentes(frase, recentes) {
  const a = palavras(frase);
  const inicio = normalizar(frase).split(" ").slice(0, 2).join(" ");
  return recentes.some((r) => {
    if (normalizar(r).split(" ").slice(0, 2).join(" ") === inicio) return true; // começa igual
    const b = palavras(r);
    const comuns = [...a].filter((p) => b.has(p)).length;
    return comuns / Math.max(1, Math.min(a.size, b.size)) >= 0.6; // mais da metade das palavras iguais
  });
}

// Jeitos diferentes de fazer graça (sorteado a cada frase, para não ficar tudo igual)
const ANGULOS = [
  "faça um trocadilho com o nome ou o tipo do produto",
  "exagere de forma cômica o quanto a pessoa precisa disso",
  "compare a economia com uma situação do dia a dia do brasileiro",
  "fale como um narrador de futebol empolgado",
  "use ironia leve sobre o preço antigo",
  "faça uma pergunta retórica engraçada para quem está lendo",
  "brinque com uma situação comum de quem usa esse produto",
  "fale como se fosse uma fofoca que você está contando para um amigo",
  "faça referência a uma situação típica de grupo de família no WhatsApp",
  "use um tom dramático de novela exagerado",
  "brinque com a relação entre a pessoa e o próprio bolso",
  "fale como um vendedor de feira animado",
];

// ---------- Gemini ----------
let modeloQueFunciona = null; // guarda o primeiro modelo que respondeu, nesta execução
let iaDesligada = false;
const modelosFora = new Set(); // modelos que falharam nesta execução (lentos, sobrecarregados...) // depois de erro de limite/chave, não tenta de novo nesta execução

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

const semConfigDePensar = new Set(); // modelos que não aceitam desligar o "pensar"

async function chamarGemini(modelo, prompt) {
  const desligarPensar = !semConfigDePensar.has(modelo);
  const corpo = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 1.25,
      // folga para os modelos que "pensam" antes de responder (a frase em si é curta)
      maxOutputTokens: 1024,
      // para uma frase curta não precisa "pensar": responde bem mais rápido
      ...(desligarPensar ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(30000),
  });
  const json = await r.json().catch(() => null);
  if (!r.ok) {
    const mensagem = json?.error?.message ?? "";
    // erro 400 com o "pensar" desligado: o modelo não aceita essa configuração; tenta de novo sem ela
    if (r.status === 400 && desligarPensar) {
      semConfigDePensar.add(modelo);
      return chamarGemini(modelo, prompt);
    }
    const erro = new Error(`Gemini ${modelo} -> ${r.status} ${mensagem}`.slice(0, 160));
    erro.status = r.status;
    throw erro;
  }
  return json?.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text).join("") ?? "";
}

function montarPrompt(oferta, campos, estilo, recentes, angulo) {
  return [
    "Você escreve frases curtas para um grupo de WhatsApp de promoções no Brasil (MukiOfertas).",
    `Escreva UMA frase ${estilo || ESTILO_PADRAO}, sobre o produto abaixo.`,
    `Jeito desta frase: ${angulo}.`,
    recentes.length
      ? `Estas frases já foram usadas no grupo. NÃO repita nenhuma, não comece com as mesmas palavras e não use a mesma ideia:\n- ${recentes.slice(0, 15).join("\n- ")}`
      : "",
    "Evite clichês como 'corre', 'aproveita', 'imperdível', 'não perca' e 'tá on'.",
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

// Devolve { frase, origem: "ia" | "banco", motivo }
// recentes = frases enviadas nas últimas mensagens (para não repetir)
export async function gerarFrase(oferta, campos, { estilo, usarIa = true, recentes = [] } = {}) {
  let motivo = !usarIa ? "IA desligada no painel" : !process.env.GEMINI_API_KEY ? "sem GEMINI_API_KEY" : iaDesligada ? "IA fora do ar nesta execução" : null;
  if (!motivo) {
    const lista = process.env.GEMINI_MODELO ? [process.env.GEMINI_MODELO] : await descobrirModelos();
    // começa pelo último que funcionou; os outros ficam de reserva
    const modelos = modeloQueFunciona ? [modeloQueFunciona, ...lista.filter((m) => m !== modeloQueFunciona)] : lista;
    if (!modelos.length) motivo = "nenhum modelo do Gemini disponível para a sua chave";
    const angulos = [...ANGULOS].sort(() => Math.random() - 0.5);
    for (const modelo of modelos) {
      if (modelosFora.has(modelo)) continue;
      try {
        // até 2 tentativas, cada uma com um jeito diferente, se a frase sair parecida com uma recente
        for (let tentativa = 0; tentativa < 2; tentativa++) {
          const frase = limpar(await chamarGemini(modelo, montarPrompt(oferta, campos, estilo, recentes, angulos[tentativa])));
          if (!frase || frase.length < 8) continue;
          modeloQueFunciona = modelo;
          if (!parecidaComRecentes(frase, recentes) || tentativa === 1) return { frase, origem: "ia" };
        }
        motivo = "a IA não devolveu frase";
      } catch (e) {
        motivo = e.name === "TimeoutError" ? `${modelo} demorou demais` : e.message;
        // chave errada ou cota do dia acabou: não adianta tentar outro modelo
        if (e.status === 401 || e.status === 403) {
          iaDesligada = true;
          break;
        }
        // modelo lento, sobrecarregado (503), sem cota (429) ou aposentado (404): tenta o próximo
        // e não usa mais esse nesta execução
        modelosFora.add(modelo);
        if (modeloQueFunciona === modelo) modeloQueFunciona = null;
        console.warn(`  [frase] ${motivo}; tentando outro modelo`);
      }
    }
  }
  return { frase: fraseDoBanco(oferta, campos, recentes), origem: "banco", motivo };
}
