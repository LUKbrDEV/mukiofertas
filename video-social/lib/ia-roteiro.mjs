// Escreve um roteiro NOVO para cada vídeo com o Gemini (a mesma GEMINI_API_KEY do robô do WhatsApp).
// Se o Gemini não estiver configurado, falhar ou devolver algo fora das regras, usa uma das
// variações prontas de lib/roteiro.mjs.
import { pegar } from "./env.mjs";
import { CENAS, roteiroReserva } from "./roteiro.mjs";

// limite de caracteres da FALA de cada cena (para caber no tempo das animações)
const LIMITES = { gancho: 70, marca: 85, lojas: 75, tempo: 60, detalhe: 70, canais: 150, cta: 70 };

async function modelosGemini(chave) {
  if (pegar("GEMINI_MODELO")) return [pegar("GEMINI_MODELO")];
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": chave }, signal: AbortSignal.timeout(15000),
    });
    const json = await r.json();
    const versao = (n) => Number((n.match(/gemini-(\d+(?:\.\d+)?)/) ?? [])[1] ?? 0);
    const nomes = (json.models ?? [])
      .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m) => String(m.name).replace(/^models\//, ""))
      .filter((n) => /^gemini-.*flash/.test(n) && !/(image|tts|audio|live|embedding|thinking|exp)/.test(n));
    // aqui o texto importa mais que a velocidade: prefere o flash "cheio" ao lite
    nomes.sort((a, b) =>
      Number(a.includes("preview")) - Number(b.includes("preview")) ||
      Number(a.includes("lite")) - Number(b.includes("lite")) ||
      versao(b) - versao(a));
    return nomes.slice(0, 4);
  } catch {
    return ["gemini-2.5-flash"];
  }
}

const brl = (v) => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function montarPrompt({ ofertas, lojas, numero, evitar }) {
  const d = ofertas[0];
  const lista = ofertas.slice(0, 5).map((o, i) =>
    `${i === 0 ? "DESTAQUE" : `oferta ${i + 1}`}: ${o.titulo_curto} | loja ${o.loja} | de R$ ${o.preco_antigo ? brl(o.preco_antigo) : "-"} por R$ ${brl(o.preco_atual)}${o.cupom ? ` | cupom ${o.cupom}` : ""}`).join("\n");
  return `Você escreve roteiros de vídeos curtos (TikTok e Reels, ~25 segundos) para o MukiOfertas,
um site brasileiro de ofertas com grupo no WhatsApp e canal no Telegram, tudo grátis.
Este é o vídeo número ${numero} de hoje. Ele precisa soar diferente dos anteriores.

Ofertas que aparecem na tela:
${lista}

Lojas que aparecem na tela: ${lojas.join(", ")}.

O vídeo tem 7 cenas fixas, nesta ordem. Escreva a FALA (o que a voz lê) e a LEGENDA (o texto na tela) de cada uma:
1. gancho: abre o vídeo com impacto, até 8 palavras. Pode ser pergunta ou afirmação. Pode citar o produto DESTAQUE e o preço dele.
2. marca: diz que o MukiOfertas garimpa/caça as melhores promoções, até 12 palavras.
3. lojas: cita as lojas da tela, até 10 palavras.
4. tempo: diz que as ofertas chegam na hora/em tempo real, até 9 palavras.
5. detalhe: diz que vem com preço${d.cupom ? ", cupom" : ""} e link direto pra comprar, até 10 palavras.
6. canais: chama pro grupo do WhatsApp, pro canal do Telegram e pro site, até 22 palavras.
7. cta: reforça que é grátis e manda tocar no link da bio, até 10 palavras.

Regras:
- Português do Brasil, tom animado e informal, como alguém falando com um amigo. Sem emoji.
- Não invente preços, descontos, prazos nem produtos: use só os dados acima.
- Na FALA escreva "Muki Ofertas" (separado) e o site como "muki ofertas ponto com ponto bê erre". Preços na fala como "199 reais e 90".
- Na LEGENDA escreva "MukiOfertas" (junto), o site como "mukiofertas.com.br" e preços como "R$ 199,90".
- A legenda repete a fala com a escrita normal (pode encurtar um pouco).
- "gancho_titulo": o gancho em 2 linhas curtas para o título grande da tela, MAIÚSCULAS, cada linha com no máximo 13 caracteres.
- "post": texto para a descrição da publicação, até 200 caracteres, terminando com 5 hashtags.
${evitar.length ? `- Não repita estes ganchos já usados: ${evitar.map((g) => `"${g}"`).join(", ")}.` : ""}

Responda só com JSON neste formato:
{"cenas":[{"id":"gancho","fala":"...","legenda":"..."}, ... as 7 cenas ...],"gancho_titulo":["...","..."],"post":"..."}`;
}

function validar(json) {
  if (!json || !Array.isArray(json.cenas)) return "sem cenas";
  const porId = Object.fromEntries(json.cenas.map((c) => [c.id, c]));
  for (const id of CENAS) {
    const c = porId[id];
    if (!c?.fala?.trim() || !c?.legenda?.trim()) return `cena ${id} vazia`;
    if (c.fala.length > LIMITES[id] * 1.25) return `fala da cena ${id} longa demais`;
    if (/[\u{1F300}-\u{1FAFF}]/u.test(c.fala)) return `emoji na fala ${id}`;
  }
  if (!/muki/i.test(porId.marca.fala)) return "marca sem o nome";
  if (!/whats/i.test(porId.canais.fala) || !/telegram/i.test(porId.canais.fala)) return "canais incompletos";
  const tit = (json.gancho_titulo ?? []).map((t) => String(t).trim().toUpperCase()).filter(Boolean);
  if (tit.length !== 2 || tit.some((t) => t.length > 16)) return "gancho_titulo inválido";
  return null;
}

export async function escreverRoteiro({ ofertas, lojas, numero = 1, evitar = [] }) {
  const chave = pegar("GEMINI_API_KEY");
  if (chave) {
    const prompt = montarPrompt({ ofertas, lojas, numero, evitar });
    for (const modelo of await modelosGemini(chave)) {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
          method: "POST",
          headers: { "x-goog-api-key": chave, "Content-Type": "application/json" },
          signal: AbortSignal.timeout(45000),
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 1.0, responseMimeType: "application/json" },
          }),
        });
        const corpo = await r.json().catch(() => null);
        if (!r.ok) { console.warn(`    [roteiro] ${modelo}: ${r.status} ${corpo?.error?.message ?? ""}`.slice(0, 160)); continue; }
        const texto = corpo?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
        const json = JSON.parse(texto.replace(/^```json\s*|```$/g, ""));
        const erro = validar(json);
        if (erro) { console.warn(`    [roteiro] ${modelo} devolveu roteiro fora das regras (${erro})`); continue; }
        const porId = Object.fromEntries(json.cenas.map((c) => [c.id, c]));
        console.log(`    roteiro escrito pelo ${modelo}`);
        return {
          origem: modelo,
          cenas: CENAS.map((id) => ({ id, fala: porId[id].fala.trim(), legenda: porId[id].legenda.trim() })),
          gancho_titulo: json.gancho_titulo.map((t) => String(t).trim().toUpperCase()),
          post: String(json.post ?? "").trim(),
        };
      } catch (e) {
        console.warn(`    [roteiro] ${modelo}: ${e.message}`.slice(0, 160));
      }
    }
  }
  console.log("    usando um roteiro pronto (reserva)");
  return { origem: "reserva", ...roteiroReserva(numero, ofertas[0]) };
}
