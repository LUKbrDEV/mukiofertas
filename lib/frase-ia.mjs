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
const TAMANHO_MAXIMO = 60; // caracteres
const PALAVRAS_PADRAO = 4; // tamanho da frase (o painel pode trocar)

export const ESTILO_PADRAO = "simples, curta e divertida, sem palavrão";

// ---------- Banco de frases (reserva) ----------
// {desconto} e {loja} são trocados pelos dados da oferta. Pode acrescentar frases à vontade.
const BANCO = {
  hardware: [
    "Setup agradece demais 🖥️", "Upgrade chegou, hein 🚀", "Seu PC merece 🔧", "Mais FPS na conta ⚡",
    "Hora do upgrade 🛠️", "Monta esse PC 💪", "RGB e economia 🌈",
  ],
  games: [
    "Bora jogar, hein 🎮", "Game over pro preço 💥", "Achievement desbloqueado 🏆", "Respawn no desconto 🔁",
    "Partida garantida 🕹️",
  ],
  telas: ["Maratona garantida 🍿", "Tela nova, vida nova 😎", "Cinema em casa 🎬", "Os olhos agradecem 👀"],
  celulares: ["Celular novo, hein 📱", "Upgrade de bolso 🤳", "Adeus celular travando 👋", "Foto boa garantida 📸"],
  casa: ["Casa agradece 🏡", "Praticidade pura ✅", "A cozinha merece 🍳", "Mãe aprovaria 👩‍🍳"],
  beleza: ["Autoestima em dia 💅", "Glow up garantido ✨", "Se cuida, hein 🧴"],
  moda: ["Look novo, hein 👕", "Estilo garantido 😎", "Armário renovado 👟"],
  infantil: ["A criançada vai amar 🧸", "Presente certeiro 🎁", "Diversão garantida 🎈"],
  mercado: ["Despensa cheia 🛒", "Abastece aí 😋", "Estoque garantido 🥫"],
  pet: ["Seu pet merece 🐶", "Rabinho balançando 🐾", "Mimo pro bichinho 🐱"],
  cupons: ["Cupom bom é usado 🎟️", "Copia e economiza 💸", "Código valendo ouro 💰"],
  geral: [
    "Achado do dia 🤫", "Tá barato, hein 👀", "Bolso agradece 🙌", "Oportunidade boa 🔥", "Vale cada centavo 💸",
    "Carrinho feliz 🛒", "Economia garantida ✅", "Promoção das boas 😍", "Olha esse preço 👀", "Compra sem culpa 😌",
    "Esse vale a pena 👌", "Dica do dia 💡",
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

export function fraseDoBanco(oferta, campos = {}, recentes = [], maxPalavras = PALAVRAS_PADRAO) {
  const grupo = GRUPO_DA_CATEGORIA[oferta.categoria];
  const usadas = new Set(recentes.map(normalizar));
  const servem = (lista) =>
    (lista ?? [])
      .filter((f) => campos.desconto || !f.includes("{desconto}"))
      .filter((f) => !usadas.has(normalizar(preencherFrase(f, campos))))
      .filter((f) => !parecidaComRecentes(preencherFrase(f, campos), recentes.slice(0, 10)));
  // frases da categoria + gerais, sem as que foram usadas nas últimas mensagens
  let lista = [...servem(BANCO[grupo]), ...servem(BANCO.geral)].filter((f) => fraseValida(preencherFrase(f, campos), maxPalavras));
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
// (o antigo "uma gíria brasileira leve" fazia a IA chamar todo mundo de "chefe")
const ANGULOS = [
  "um trocadilho curtinho com o tipo do produto",
  "uma exclamação empolgada",
  "um elogio rápido ao produto",
  "um convite simples para quem usa esse produto",
  "uma brincadeira curta com o dia a dia",
  "o que a pessoa vai sentir usando o produto",
  "uma comparação engraçada com algo do cotidiano",
  "uma pergunta curta e divertida",
];

// Vocativos/bordões que a IA vicia em usar: nunca entram na frase
const PROIBIDAS_SEMPRE = [
  "chefe", "chefia", "patrao", "patroa", "mano", "mana", "brother", "parca", "parceiro", "parceira",
  "consagrado", "meu rei", "minha rainha", "campeao", "fera", "querido", "querida", "amigo", "amiga",
];

// Palavras que já apareceram em 2 ou mais das últimas frases: ficam proibidas por um tempo
function palavrasGastas(recentes) {
  const conta = new Map();
  for (const r of recentes.slice(0, 25)) {
    for (const p of palavras(r)) conta.set(p, (conta.get(p) ?? 0) + 1);
  }
  return [...conta].filter(([, n]) => n >= 2).map(([p]) => p);
}

function usaPalavraProibida(frase, gastas = []) {
  const texto = ` ${normalizar(frase)} `;
  if (PROIBIDAS_SEMPRE.some((p) => texto.includes(` ${p} `))) return true;
  const minhas = palavras(frase);
  return gastas.some((p) => minhas.has(p));
}

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
      temperature: 1.1,
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

function montarPrompt(oferta, campos, estilo, recentes, angulo, maxPalavras, gastas = []) {
  return [
    "Você escreve frases bem curtas para um grupo de WhatsApp de promoções no Brasil.",
    `Escreva UMA frase ${estilo || ESTILO_PADRAO}, com NO MÁXIMO ${maxPalavras} palavras, sobre o produto abaixo.`,
    "A frase tem que falar DESTE produto (para que ele serve, quem usa, a sensação de ter), não ser genérica.",
    `Ideia: ${angulo}.`,
    "PROIBIDO: preço, valores, números, porcentagem, nome da loja, desconto em números, hashtags e aspas.",
    "PROIBIDO chamar o leitor de chefe, chefia, patrão, mano, parceiro, campeão, fera ou qualquer apelido.",
    gastas.length ? `PROIBIDO usar estas palavras (já foram usadas demais): ${gastas.slice(0, 30).join(", ")}` : "",
    "Pode usar 1 emoji no final. Responda só com a frase.",
    recentes.length ? `Não repita estas (nem parecidas): ${recentes.slice(0, 25).join(" | ")}` : "",
    "",
    // só o produto: sem preço, loja ou desconto, para a IA não citar esses dados
    oferta.categoria === "cupons" ? `Cupom de desconto: ${campos.titulo}` : `Produto: ${campos.titulo}`,
  ]
    .filter((l) => l !== "")
    .join("\n");
}

// A frase serve? Sem números/preço e com no máximo X palavras (emoji não conta)
const NUMERO_ESCRITO =
  /\b(reais|real|r\$|centavos?|mil|cem|cento|duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos|cinquenta|quarenta|trinta|vinte|dez|noventa|oitenta|setenta|sessenta|por ?cento|amazon|shopee|kabum|mercado livre|aliexpress)\b/i;
export function fraseValida(frase, maxPalavras = PALAVRAS_PADRAO) {
  if (!frase || /\d/.test(frase) || NUMERO_ESCRITO.test(frase)) return false;
  const palavras = frase
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, " ")
    .split(/\s+/)
    .filter((p) => /[\p{L}]/u.test(p));
  return palavras.length >= 1 && palavras.length <= maxPalavras;
}

// Devolve { frase, origem: "ia" | "banco", motivo }
// recentes = frases enviadas nas últimas mensagens (para não repetir)
export async function gerarFrase(oferta, campos, { estilo, usarIa = true, recentes = [], maxPalavras = PALAVRAS_PADRAO } = {}) {
  let motivo = !usarIa ? "IA desligada no painel" : !process.env.GEMINI_API_KEY ? "sem GEMINI_API_KEY" : iaDesligada ? "IA fora do ar nesta execução" : null;
  if (!motivo) {
    const lista = process.env.GEMINI_MODELO ? [process.env.GEMINI_MODELO] : await descobrirModelos();
    // começa pelo último que funcionou; os outros ficam de reserva
    const modelos = modeloQueFunciona ? [modeloQueFunciona, ...lista.filter((m) => m !== modeloQueFunciona)] : lista;
    if (!modelos.length) motivo = "nenhum modelo do Gemini disponível para a sua chave";
    const angulos = [...ANGULOS].sort(() => Math.random() - 0.5);
    const gastas = palavrasGastas(recentes);
    for (const modelo of modelos) {
      if (modelosFora.has(modelo)) continue;
      try {
        // até 3 tentativas: a frase precisa ser curta, sem preço/números, sem bordão e diferente das recentes
        for (let tentativa = 0; tentativa < 3; tentativa++) {
          const frase = limpar(
            await chamarGemini(modelo, montarPrompt(oferta, campos, estilo, recentes, angulos[tentativa], maxPalavras, gastas))
          );
          modeloQueFunciona = modelo;
          if (
            fraseValida(frase, maxPalavras) &&
            !usaPalavraProibida(frase, gastas) &&
            !parecidaComRecentes(frase, recentes)
          )
            return { frase, origem: "ia" };
        }
        motivo = "a IA só devolveu frases longas, com preço ou repetidas";
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
  return { frase: fraseDoBanco(oferta, campos, recentes, maxPalavras), origem: "banco", motivo };
}
