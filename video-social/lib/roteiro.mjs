// Cenas do vídeo e roteiros prontos (usados quando o Gemini não responde).
// Cada cena tem a FALA (o que a voz lê) e a LEGENDA (o que aparece escrito).
// A ordem e os ids precisam bater com as cenas do template.html.

export const CENAS = ["gancho", "marca", "lojas", "tempo", "detalhe", "canais", "cta"];
export const LOJAS_PADRAO = ["Amazon", "Mercado Livre", "Shopee", "Magalu"];

const falaPreco = (v) => {
  const [r, c] = Number(v).toFixed(2).split(".");
  return c === "00" ? `${r} reais` : `${r} reais e ${Number(c)}`;
};
const legPreco = (v) => "R$\u00a0" + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const VARIACOES = [
  () => ({
    gancho_titulo: ["AINDA PAGA", "PREÇO CHEIO?"],
    cenas: {
      gancho: ["Ainda paga preço cheio?", "Ainda paga preço cheio?"],
      marca: ["No Muki Ofertas, a gente garimpa as melhores promoções", "No MukiOfertas, a gente garimpa as melhores promoções"],
      lojas: ["da Amazon, Mercado Livre, Shopee e Magalu,", "da Amazon, Mercado Livre, Shopee e Magalu..."],
      tempo: ["e manda pra você em tempo real,", "e manda pra você em tempo real"],
      detalhe: ["com preço, cupom e o link direto.", "com preço, cupom e o link direto."],
      canais: ["Entra no nosso grupo do WhatsApp, no canal do Telegram, ou acessa muki ofertas ponto com ponto bê erre.", "Entra no grupo do WhatsApp, no canal do Telegram ou acessa mukiofertas.com.br"],
      cta: ["É de graça! Toca no link da bio e entra agora!", "É de graça! Toca no link da bio e entra agora!"],
    },
    post: "Promoção boa todo dia, de graça, no WhatsApp e no Telegram. Link na bio! #promocao #ofertas #achadinhos #economia #mukiofertas",
  }),
  () => ({
    gancho_titulo: ["PARA DE", "PAGAR CARO!"],
    cenas: {
      gancho: ["Para de pagar caro!", "Para de pagar caro!"],
      marca: ["O Muki Ofertas caça as melhores promoções da internet pra você", "O MukiOfertas caça as melhores promoções da internet pra você"],
      lojas: ["Amazon, Mercado Livre, Shopee, Magalu e muito mais,", "Amazon, Mercado Livre, Shopee, Magalu e muito mais"],
      tempo: ["e avisa assim que a oferta aparece,", "e avisa assim que a oferta aparece"],
      detalhe: ["já com o preço, o cupom e o link pra comprar.", "já com o preço, o cupom e o link pra comprar."],
      canais: ["Tem grupo no WhatsApp, canal no Telegram e o site muki ofertas ponto com ponto bê erre.", "Tem grupo no WhatsApp, canal no Telegram e o site mukiofertas.com.br"],
      cta: ["Tudo de graça! O link tá na bio, entra agora!", "Tudo de graça! O link tá na bio, entra agora!"],
    },
    post: "Chega de pagar caro: as melhores promoções chegam na hora no seu celular. Link na bio! #ofertas #promocao #descontos #compras #mukiofertas",
  }),
  (d) => ({
    gancho_titulo: ["OLHA ESSE", "PREÇO!"],
    cenas: {
      gancho: [`Olha esse preço: ${d.titulo_curto.replace("…", "")} por ${falaPreco(d.preco_atual)}!`, `Olha esse preço: ${d.titulo_curto} por ${legPreco(d.preco_atual)}!`],
      marca: ["Essa e outras promoções você encontra no Muki Ofertas,", "Essa e outras promoções você encontra no MukiOfertas"],
      lojas: ["garimpadas na Amazon, Shopee, Mercado Livre e Magalu,", "garimpadas na Amazon, Shopee, Mercado Livre e Magalu"],
      tempo: ["e enviadas na hora pro seu celular,", "e enviadas na hora pro seu celular"],
      detalhe: ["com o preço certinho e o link direto.", "com o preço certinho e o link direto."],
      canais: ["É só entrar no grupo do WhatsApp, no canal do Telegram, ou acessar muki ofertas ponto com ponto bê erre.", "É só entrar no grupo do WhatsApp, no canal do Telegram ou acessar mukiofertas.com.br"],
      cta: ["Não paga nada! Toca no link da bio!", "Não paga nada! Toca no link da bio!"],
    },
    post: `${d.titulo_curto} por ${legPreco(d.preco_atual)} e muito mais no MukiOfertas. Link na bio! #achadinhos #promocao #ofertasdodia #economia #mukiofertas`,
  }),
  () => ({
    gancho_titulo: ["QUER", "ECONOMIZAR?"],
    cenas: {
      gancho: ["Quer economizar de verdade?", "Quer economizar de verdade?"],
      marca: ["Então segue o Muki Ofertas, que garimpa promoção o dia todo", "Então segue o MukiOfertas, que garimpa promoção o dia todo"],
      lojas: ["nas maiores lojas do Brasil,", "nas maiores lojas do Brasil"],
      tempo: ["e te manda tudo em tempo real,", "e te manda tudo em tempo real"],
      detalhe: ["com preço, cupom e link direto.", "com preço, cupom e link direto."],
      canais: ["Escolhe onde receber: grupo do WhatsApp, canal do Telegram ou muki ofertas ponto com ponto bê erre.", "Escolhe onde receber: grupo do WhatsApp, canal do Telegram ou mukiofertas.com.br"],
      cta: ["E o melhor: é grátis! Link na bio.", "E o melhor: é grátis! Link na bio."],
    },
    post: "Economizar de verdade é receber a promoção certa na hora certa. Grátis! Link na bio. #economia #ofertas #promocao #dicasdecompras #mukiofertas",
  }),
];

// numero: 1, 2, 3... (vídeo do dia). Gira entre as variações conforme o dia.
export function roteiroReserva(numero, destaque) {
  const dia = Math.floor(Date.now() / 86400000);
  const v = VARIACOES[(dia * 3 + numero) % VARIACOES.length](destaque);
  return {
    gancho_titulo: v.gancho_titulo,
    post: v.post,
    cenas: CENAS.map((id) => ({ id, fala: v.cenas[id][0], legenda: v.cenas[id][1] })),
  };
}

// Junta as falas num texto só e devolve onde cada cena começa/termina no texto
export function textoCompleto(cenas) {
  let texto = "";
  const trechos = cenas.map((c) => {
    if (texto) texto += " ";
    const ini = texto.length;
    texto += c.fala;
    return { ini, fim: texto.length };
  });
  return { texto, trechos };
}

// Converte o alinhamento por caractere da ElevenLabs em tempos por cena
export function temposDasCenas(cenas, alinhamento, duracaoAudio, { cauda = 1.2 } = {}) {
  const { trechos } = textoCompleto(cenas);
  const iniC = alinhamento.character_start_times_seconds;
  const fimC = alinhamento.character_end_times_seconds;
  const falas = trechos.map(({ ini, fim }) => ({ falaIni: iniC[ini] ?? 0, falaFim: fimC[fim - 1] ?? duracaoAudio }));
  return cenas.map((c, i) => ({
    id: c.id,
    legenda: c.legenda,
    falaIni: falas[i].falaIni,
    falaFim: falas[i].falaFim,
    ini: i === 0 ? 0 : Math.max(0, falas[i].falaIni - 0.12),
    fim: i === cenas.length - 1 ? duracaoAudio + cauda : Math.max(0, falas[i + 1].falaIni - 0.12),
  }));
}

// Sem voz: estima os tempos pelo tamanho das falas (só para pré-visualizar o visual)
export function temposEstimados(cenas, { porCaractere = 0.068, pausa = 0.35, cauda = 1.2 } = {}) {
  let t = 0.2;
  const falas = cenas.map((c) => {
    const ini = t;
    t += c.fala.length * porCaractere;
    const r = { falaIni: ini, falaFim: t };
    t += pausa;
    return r;
  });
  return {
    duracao: t - pausa + cauda,
    cenas: cenas.map((c, i) => ({
      id: c.id,
      legenda: c.legenda,
      ...falas[i],
      ini: i === 0 ? 0 : falas[i].falaIni - 0.12,
      fim: i === cenas.length - 1 ? t - pausa + cauda : falas[i + 1].falaIni - 0.12,
    })),
  };
}
