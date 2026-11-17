// Variações dos vídeos, para eles não ficarem todos iguais.
// A cada vídeo o gerador sorteia um FORMATO (tipo de conteúdo: quais cenas e em que ordem), um
// TEMA de cores e um ESTILO de gancho, sem repetir o formato e o tema do vídeo anterior.
//
// Para testar um específico: node gerar.mjs --formato=adivinhe --tema=roxo
// Para tirar um formato do sorteio: apague a linha dele em FORMATOS.
// Cenas que existem no template.html:
//   ofertas: gancho, marca, lojas, tempo, detalhe, ranking, canais, cta
//   adivinhe o preço: adivinhe, revela      humor: reacao, meme
//   POV: pov, whats                         dicas: dica_titulo, dica1, dica2, dica3
//   mascote 3D (lowpoly.js): muki_abre, muki_oferta, muki_reage, muki_tchau

export const FORMATOS = {
  // ---- vitrine de ofertas
  classico: { nome: "clássico", cenas: ["gancho", "marca", "lojas", "tempo", "detalhe", "canais", "cta"] },
  top3: { nome: "top 3", cenas: ["gancho", "ranking", "marca", "canais", "cta"] },
  direto: { nome: "direto ao ponto", cenas: ["gancho", "detalhe", "ranking", "cta"] },
  vitrine: { nome: "vitrine", cenas: ["gancho", "lojas", "tempo", "detalhe", "cta"] },

  // ---- conteúdo diferente
  adivinhe: {
    nome: "adivinhe o preço",
    cenas: ["adivinhe", "revela", "ranking", "cta"],
    instrucao: "jogo 'adivinhe o preço': desafie quem assiste a chutar o preço do DESTAQUE, faça suspense e depois revele o preço com desconto.",
  },
  humor: {
    nome: "humor",
    cenas: ["reacao", "meme", "detalhe", "cta"],
    instrucao: "vídeo de HUMOR estilo meme brasileiro sobre compras e promoções (pagar caro, carrinho cheio, salário acabando, 'quem tá no grupo' vs. 'quem não tá'). Piada leve, sem ofender ninguém, sem palavrão e sem citar pessoas reais.",
  },
  pov: {
    nome: "POV",
    cenas: ["pov", "whats", "reacao", "cta"],
    instrucao: "vídeo estilo 'POV:' (ponto de vista) mostrando o que acontece quando a pessoa entra no Grupo VIP do WhatsApp e começa a receber as ofertas. Tom divertido e do dia a dia.",
  },
  mascote: {
    nome: "mascote 3D",
    cenas: ["muki_abre", "muki_oferta", "muki_reage", "muki_tchau"],
    instrucao: "vídeo com o MUKI, o mascote 3D do MukiOfertas (um bichinho azul de boné laranja), que aparece na tela, apresenta a oferta DESTAQUE e reage ao preço. Fale como se fosse o próprio Muki falando, em primeira pessoa, divertido.",
  },
  dicas: {
    nome: "dicas de compra",
    cenas: ["dica_titulo", "dica1", "dica2", "dica3", "cta"],
    instrucao: "vídeo de DICAS DE COMPRA úteis, que a pessoa queira salvar. Dicas práticas e verdadeiras, sem inventar números, estatísticas, datas ou leis.",
  },
};

// assuntos dos vídeos de dicas (um é sorteado por vídeo)
export const ASSUNTOS_DICAS = [
  "como saber se uma promoção é de verdade ou se o preço foi inflado antes",
  "como não cair em golpe de loja falsa na internet",
  "como comprar eletrodoméstico mais barato",
  "o que olhar antes de comprar um celular em promoção",
  "como usar cupom de desconto e não perder a oferta",
  "como comprar na Black Friday sem se arrepender",
  "o que conferir antes de comprar uma TV",
  "como economizar no frete nas compras online",
];

// temas de cor (template.html, body.tema-*)
export const TEMAS = ["azul", "noite", "verde", "roxo"];

// jeito de abrir os vídeos de vitrine (vai para o roteiro do Gemini)
export const ESTILOS_GANCHO = [
  "pergunta provocante para quem ainda paga caro",
  "choque de preço: comece pelo preço do produto destaque",
  "curiosidade: algo que faz a pessoa querer ver até o fim",
  "urgência: a oferta pode acabar a qualquer momento",
  "comparação: quanto custava antes e quanto custa agora",
  "conselho de amigo: 'se você vai comprar X, espera'",
];

const sortear = (lista, evitar) => {
  const opcoes = lista.filter((x) => x !== evitar);
  return opcoes[Math.floor(Math.random() * opcoes.length)] ?? lista[0];
};

// historico.videos: [{ formato, tema, ... }] do gerar.mjs
export function escolherVariacao(historico, { formato, tema } = {}) {
  const ultimo = (historico?.videos ?? []).at(-1) ?? {};
  const f = FORMATOS[formato] ? formato : sortear(Object.keys(FORMATOS), ultimo.formato);
  const t = TEMAS.includes(tema) || tema === "blackfriday" ? tema : sortear(TEMAS, ultimo.tema);
  const def = FORMATOS[f];
  let instrucao = def.instrucao ?? "";
  if (f === "dicas") instrucao += ` Assunto: ${sortear(ASSUNTOS_DICAS, ultimo.assunto)}.`;
  return {
    formato: f,
    cenas: def.cenas,
    tema: t,
    gancho: sortear(ESTILOS_GANCHO, ultimo.gancho),
    instrucao,
    assunto: f === "dicas" ? instrucao.split("Assunto: ")[1]?.replace(/\.$/, "") : undefined,
  };
}
