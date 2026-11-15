// "Sobre o produto" escrito pela IA (Gemini) para as ofertas que não trazem detalhes da loja.
// Salve como lib/sobre-ia.mjs. Usado por lib/salvar-oferta.js e scripts/preencher-sobre.mjs.
//
// Regras de segurança (para não mostrar informação errada na página):
//  - A IA recebe SÓ o título e a categoria. Ela não inventa medidas, números nem compatibilidades.
//  - Qualquer tópico com um número que não está no título é descartado (ex.: "bateria de 5000 mAh").
//  - Tópicos com preço, desconto, nome de loja ou frases de propaganda também são descartados.
//  - A tabela de "Especificações" NUNCA é preenchida pela IA.
//  - A página mostra o aviso "Resumo gerado automaticamente" (coluna sobre_ia = true).
//
// Variáveis (no .env.local, .env.robo e nos Secrets do GitHub):
//   GEMINI_API_KEY   a mesma chave das frases do WhatsApp
//   GEMINI_MODELO    (opcional) força um modelo
//   SOBRE_IA=0       (opcional) desliga a geração

const MIN_TOPICOS = 2;
const MAX_TOPICOS = 4;
const MAX_CARACTERES = 160;

let modelos = null;
let modeloQueFunciona = null;
let iaFora = false; // chave errada / cota do dia acabou: não tenta mais nesta execução
const modelosFora = new Set();

async function descobrirModelos() {
  if (modelos) return modelos;
  if (process.env.GEMINI_MODELO) return (modelos = [process.env.GEMINI_MODELO]);
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY },
      signal: AbortSignal.timeout(15000),
    });
    const json = await r.json().catch(() => null);
    if (!r.ok) throw new Error(`${r.status} ${json?.error?.message ?? ""}`);
    const versao = (n) => Number((n.match(/gemini-(\d+(?:\.\d+)?)/) ?? [])[1] ?? 0);
    const nomes = (json?.models ?? [])
      .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m) => String(m.name).replace(/^models\//, ""))
      .filter((n) => /^gemini-.*flash/.test(n))
      .filter((n) => !/(image|tts|audio|live|embedding|thinking|exp)/.test(n));
    // estáveis primeiro; aqui o "flash" normal vem antes do "lite" (escreve melhor), depois o mais novo
    nomes.sort(
      (a, b) =>
        Number(a.includes("preview")) - Number(b.includes("preview")) ||
        Number(a.includes("lite")) - Number(b.includes("lite")) ||
        versao(b) - versao(a)
    );
    modelos = nomes.slice(0, 6);
  } catch (e) {
    console.warn(`  [sobre-ia] não consegui listar os modelos do Gemini (${e.message})`);
    modelos = [];
  }
  return modelos;
}

const semConfigDePensar = new Set();
async function chamarGemini(modelo, prompt) {
  const desligarPensar = !semConfigDePensar.has(modelo);
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3, // baixo: queremos texto fiel, não criativo
        maxOutputTokens: 1024,
        ...(desligarPensar ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    }),
    signal: AbortSignal.timeout(25000),
  });
  const json = await r.json().catch(() => null);
  if (!r.ok) {
    if (r.status === 400 && desligarPensar) {
      semConfigDePensar.add(modelo);
      return chamarGemini(modelo, prompt);
    }
    const erro = new Error(`Gemini ${modelo} -> ${r.status} ${json?.error?.message ?? ""}`.slice(0, 160));
    erro.status = r.status;
    throw erro;
  }
  return json?.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text).join("") ?? "";
}

function montarPrompt(titulo, categoria) {
  return [
    "Você escreve a seção \"Sobre o produto\" de um site brasileiro de ofertas.",
    `Escreva de ${MIN_TOPICOS + 1} a ${MAX_TOPICOS} tópicos curtos (uma frase cada, até 20 palavras) sobre o produto abaixo.`,
    "Fale do que é o produto, para que serve e para quem é indicado, usando SÓ o que dá para saber pelo título.",
    "REGRAS OBRIGATÓRIAS:",
    "- NÃO invente características técnicas, medidas, capacidade, potência, voltagem, compatibilidade, cor, garantia ou conteúdo da caixa que não estejam no título.",
    "- NÃO escreva nenhum número que não apareça no título.",
    "- NÃO fale de preço, desconto, frete, loja, estoque ou promoção.",
    "- NÃO use propaganda exagerada (\"o melhor\", \"imperdível\", \"incrível\") nem emojis.",
    "- Se você não reconhecer o produto, escreva tópicos gerais sobre o tipo de produto, sem detalhes específicos.",
    "Responda só com os tópicos, um por linha, começando cada linha com \"- \".",
    "",
    `Produto: ${titulo}`,
    categoria ? `Categoria no site: ${categoria}` : "",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

const normalizar = (t) =>
  String(t ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const PROIBIDO =
  /\b(r\$|reais|preco|precos|desconto|descontos|promocao|promocoes|oferta|ofertas|frete|cupom|cupons|estoque|amazon|shopee|kabum|mercado livre|aliexpress|magalu|magazine luiza|netshoes|imperdivel|incrivel|o melhor|a melhor|garantia)\b/;

// números do texto (5000, 1,5, 4k -> "4"), para comparar com os do título
const numeros = (t) => (normalizar(t).match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", "."));

export function filtrarTopicos(texto, titulo) {
  const noTitulo = new Set(numeros(titulo));
  const vistos = new Set();
  return String(texto ?? "")
    .split("\n")
    .map((l) =>
      l
        .replace(/^\s*(?:[-–•*]|\d+[.)])\s*/, "")
        .replace(/\*\*/g, "")
        .replace(/[\p{Extended_Pictographic}️‍]/gu, "")
        .trim()
    )
    .filter((l) => l.length >= 15 && l.length <= MAX_CARACTERES)
    .filter((l) => !PROIBIDO.test(normalizar(l)))
    .filter((l) => numeros(l).every((n) => noTitulo.has(n)))
    .map((l) => (/[.!?]$/.test(l) ? l : `${l}.`))
    .filter((l) => {
      const chave = normalizar(l);
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    })
    .slice(0, MAX_TOPICOS);
}

// Devolve ["tópico 1", ...] ou null (IA desligada, sem chave, falhou ou não passou nas regras)
export async function gerarSobreIA({ titulo, categoria } = {}) {
  if (process.env.SOBRE_IA === "0" || !process.env.GEMINI_API_KEY || iaFora) return null;
  if (!titulo || categoria === "cupons") return null;
  const lista = await descobrirModelos();
  const ordem = modeloQueFunciona ? [modeloQueFunciona, ...lista.filter((m) => m !== modeloQueFunciona)] : lista;
  for (const modelo of ordem) {
    if (modelosFora.has(modelo)) continue;
    try {
      const resposta = await chamarGemini(modelo, montarPrompt(String(titulo).slice(0, 200), categoria));
      modeloQueFunciona = modelo;
      const topicos = filtrarTopicos(resposta, titulo);
      // o modelo respondeu mas fora das regras: outro modelo não costuma ir melhor
      return topicos.length >= MIN_TOPICOS ? topicos : null;
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        iaFora = true;
        console.warn(`  [sobre-ia] ${e.message}; IA desligada nesta execução`);
        return null;
      }
      modelosFora.add(modelo); // lento, sobrecarregado, sem cota ou aposentado: tenta o próximo
      if (modeloQueFunciona === modelo) modeloQueFunciona = null;
      console.warn(`  [sobre-ia] ${e.name === "TimeoutError" ? `${modelo} demorou demais` : e.message}`);
    }
  }
  return null;
}

// true quando todos os modelos falharam ou a chave/cota acabou (o script de lote para de tentar)
export const iaIndisponivel = () => iaFora || (modelos !== null && modelos.length > 0 && modelos.every((m) => modelosFora.has(m)));
