// Escreve um roteiro NOVO para cada vídeo com o Gemini (a mesma GEMINI_API_KEY do robô do WhatsApp).
// Se o Gemini não estiver configurado, falhar ou devolver algo fora das regras, usa uma das
// variações prontas de lib/roteiro.mjs.
import { pegar } from "./env.mjs";
import { CENAS, roteiroReserva } from "./roteiro.mjs";

// limite de caracteres da FALA de cada cena (para caber no tempo das animações)
const LIMITES = {
  gancho: 70, marca: 85, lojas: 75, tempo: 60, detalhe: 70, ranking: 150, canais: 150, cta: 80,
  adivinhe: 90, revela: 80, reacao: 95, meme: 110, pov: 80, whats: 95,
  dica_titulo: 80, dica1: 115, dica2: 115, dica3: 115,
  muki_abre: 80, muki_oferta: 110, muki_reage: 95, muki_tchau: 90,
};
// textos que aparecem na tela além da legenda (campo: limite de caracteres)
const EXTRAS = {
  reacao: { texto_tela: 70, emoji: 8 },
  meme: { rotulo_a: 32, emoji_a: 8, rotulo_b: 32, emoji_b: 8 },
  pov: { texto_tela: 55 },
  dica_titulo: { titulo_tela: 45 },
  dica1: { texto_tela: 70 },
  dica2: { texto_tela: 70 },
  dica3: { texto_tela: 70 },
  muki_abre: { titulo_tela: 30 },
  muki_reage: { texto_tela: 60, emoji: 8 },
};

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

// O que cada cena precisa dizer (o formato do vídeo escolhe quais entram e em que ordem)
function descricaoCena(id, d) {
  return {
    gancho: "abre o vídeo com impacto, até 8 palavras. Pode citar o produto DESTAQUE e o preço dele.",
    marca: "diz que o MukiOfertas garimpa/caça as melhores promoções, até 12 palavras.",
    lojas: "cita as lojas da tela, até 10 palavras.",
    tempo: "diz que as ofertas chegam na hora/em tempo real, até 9 palavras.",
    detalhe: `diz que vem com preço${d.cupom ? ", cupom" : ""} e link direto pra comprar, até 10 palavras.`,
    ranking: "apresenta o TOP 3 de hoje: o DESTAQUE, a oferta 2 e a oferta 3, com o nome curto e o preço de cada uma, até 24 palavras.",
    canais: "chama pro grupo do WhatsApp, pro canal do Telegram e pro site, até 22 palavras.",
    cta: "reforça que é grátis e manda tocar no link da bio pra entrar no grupo do WhatsApp, até 12 palavras.",
    adivinhe: "desafia: 'quanto você acha que custa' o DESTAQUE (diga o nome curto), pede pra pessoa chutar nos comentários e termina contando 'três, dois, um', até 16 palavras. NÃO diga o preço aqui.",
    revela: "revela o preço do DESTAQUE com surpresa e compara com o preço antigo, até 14 palavras.",
    reacao: 'reação engraçada à oferta, estilo meme. Campos extras: "texto_tela" (a frase do meme escrita na tela, até 70 caracteres, ex.: "minha cara quando vi a air fryer por R$ 279") e "emoji" (1 emoji da reação). A fala comenta a situação, até 16 palavras.',
    meme: 'comparação estilo meme entre quem paga caro e quem está no grupo, usando o preço antigo e o preço atual do DESTAQUE. Campos extras: "rotulo_a" (até 32 caracteres, ex.: "Eu pagando preço cheio"), "emoji_a" (1 emoji), "rotulo_b" (até 32 caracteres, ex.: "Quem tá no Grupo VIP"), "emoji_b" (1 emoji). Fala até 20 palavras.',
    pov: 'abre com "POV:" e a situação. Campo extra: "texto_tela" (a frase depois do "POV:", até 55 caracteres, ex.: "você entrou no Grupo VIP do MukiOfertas e..."). Fala até 14 palavras.',
    whats: "conta que as ofertas começam a chegar no WhatsApp (as da tela), com um tom divertido, até 16 palavras.",
    dica_titulo: 'apresenta o assunto das dicas e pede pra salvar o vídeo. Campo extra: "titulo_tela" (título grande da tela, até 45 caracteres, ex.: "3 dicas pra não cair em promoção falsa"). Fala até 14 palavras.',
    muki_abre: 'o Muki aparece e chama atenção (ex.: "Ei, para tudo! Olha o que eu achei"), até 12 palavras. Campo extra: "titulo_tela": título grande em 2 partes separadas por "|", MAIÚSCULAS, cada parte com até 13 caracteres (ex.: "PARA|TUDO!").',
    muki_oferta: "o Muki apresenta o DESTAQUE: nome curto, preço antigo e preço atual, até 20 palavras.",
    muki_reage: 'o Muki reage ao preço de um jeito engraçado, até 16 palavras. Campos extras: "texto_tela" (o que ele diz no balão, até 60 caracteres) e "emoji" (1 emoji da reação).',
    muki_tchau: "o Muki chama pro Grupo VIP do WhatsApp, que é grátis, e manda tocar no link da bio, até 16 palavras.",
    dica1: 'a 1ª dica. Campo extra: "texto_tela" (a dica resumida na tela, até 70 caracteres). Fala até 20 palavras.',
    dica2: 'a 2ª dica. Campo extra: "texto_tela" (a dica resumida na tela, até 70 caracteres). Fala até 20 palavras.',
    dica3: 'a 3ª dica, dizendo que no MukiOfertas o preço já é conferido. Campo extra: "texto_tela" (a dica resumida na tela, até 70 caracteres). Fala até 20 palavras.',
  }[id];
}

function montarPrompt({ ofertas, lojas, numero, evitar, cenas, estiloGancho, instrucao }) {
  const d = ofertas[0];
  const lista = ofertas.slice(0, 5).map((o, i) =>
    `${i === 0 ? "DESTAQUE" : `oferta ${i + 1}`}: ${o.titulo_curto} | loja ${o.loja} | de R$ ${o.preco_antigo ? brl(o.preco_antigo) : "-"} por R$ ${brl(o.preco_atual)}${o.cupom ? ` | cupom ${o.cupom}` : ""}`).join("\n");
  const segundos = Math.round(cenas.length * 3.6);
  return `Você escreve roteiros de vídeos curtos (TikTok e Reels, ~${segundos} segundos) para o MukiOfertas,
um site brasileiro de ofertas com grupo no WhatsApp e canal no Telegram, tudo grátis.
Este é o vídeo número ${numero} de hoje. Ele precisa soar diferente dos anteriores.

Ofertas que aparecem na tela:
${lista}

Lojas que aparecem na tela: ${lojas.join(", ")}.

O vídeo tem ${cenas.length} cenas fixas, nesta ordem. Escreva a FALA (o que a voz lê) e a LEGENDA (o texto na tela) de cada uma:
${cenas.map((id, i) => `${i + 1}. ${id}: ${descricaoCena(id, d)}`).join("\n")}
${instrucao ? `\nFormato deste vídeo: ${instrucao}\n` : ""}${cenas.includes("gancho") ? `\nEstilo do gancho deste vídeo: ${estiloGancho}.\n` : ""}
Regras:
- Português do Brasil, tom animado e informal, como alguém falando com um amigo. Sem emoji.
- Não invente preços, descontos, prazos nem produtos: use só os dados acima.
- Na FALA escreva "Muki Ofertas" (separado) e o site como "muki ofertas ponto com ponto bê erre". Preços na fala como "199 reais e 90".
- Na LEGENDA escreva "MukiOfertas" (junto), o site como "mukiofertas.com.br" e preços como "R$ 199,90".
- A legenda repete a fala com a escrita normal (pode encurtar um pouco).
- "gancho_titulo": o gancho em 2 linhas curtas para o título grande da tela, MAIÚSCULAS, cada linha com no máximo 13 caracteres.
- Os campos extras pedidos em algumas cenas vão dentro do objeto da cena, junto com "fala" e "legenda".
- "post": texto para a descrição da publicação, até 200 caracteres, terminando com 5 hashtags.
${evitar.length ? `- Não repita estes ganchos já usados: ${evitar.map((g) => `"${g}"`).join(", ")}.` : ""}

Responda só com JSON neste formato:
{"cenas":[{"id":"${cenas[0]}","fala":"...","legenda":"..."}, ... as ${cenas.length} cenas, com estes ids: ${cenas.join(", ")} ...],"gancho_titulo":["...","..."],"post":"..."}`;
}

function validar(json, cenas = CENAS) {
  if (!json || !Array.isArray(json.cenas)) return "sem cenas";
  const porId = Object.fromEntries(json.cenas.map((c) => [c.id, c]));
  for (const id of cenas) {
    const c = porId[id];
    if (!c?.fala?.trim() || !c?.legenda?.trim()) return `cena ${id} vazia`;
    if (c.fala.length > LIMITES[id] * 1.25) return `fala da cena ${id} longa demais`;
    if (/[\u{1F300}-\u{1FAFF}]/u.test(c.fala)) return `emoji na fala ${id}`;
    for (const [campo, max] of Object.entries(EXTRAS[id] ?? {})) {
      const v = String(c[campo] ?? "").trim();
      if (!v) return `cena ${id} sem ${campo}`;
      if (v.length > max * 1.3) return `${campo} da cena ${id} longo demais`;
    }
  }
  if (porId.marca && cenas.includes("marca") && !/muki/i.test(porId.marca.fala)) return "marca sem o nome";
  if (cenas.includes("canais") && (!/whats/i.test(porId.canais.fala) || !/telegram/i.test(porId.canais.fala))) return "canais incompletos";
  const tit = (json.gancho_titulo ?? []).map((t) => String(t).trim().toUpperCase()).filter(Boolean);
  if (cenas.includes("gancho") && (tit.length !== 2 || tit.some((t) => t.length > 16))) return "gancho_titulo inválido";
  return null;
}

export async function escreverRoteiro({ ofertas, lojas, numero = 1, evitar = [], cenas = CENAS, estiloGancho = "pergunta ou afirmação de impacto", instrucao = "" }) {
  const chave = pegar("GEMINI_API_KEY");
  if (chave) {
    const prompt = montarPrompt({ ofertas, lojas, numero, evitar, cenas, estiloGancho, instrucao });
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
        const erro = validar(json, cenas);
        if (erro) { console.warn(`    [roteiro] ${modelo} devolveu roteiro fora das regras (${erro})`); continue; }
        const porId = Object.fromEntries(json.cenas.map((c) => [c.id, c]));
        const extras = (id) => Object.fromEntries(Object.keys(EXTRAS[id] ?? {}).map((k) => [k, String(porId[id][k]).trim()]));
        console.log(`    roteiro escrito pelo ${modelo}`);
        return {
          origem: modelo,
          cenas: cenas.map((id) => ({ id, fala: porId[id].fala.trim(), legenda: porId[id].legenda.trim(), ...extras(id) })),
          gancho_titulo: (json.gancho_titulo ?? []).map((t) => String(t).trim().toUpperCase()),
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
