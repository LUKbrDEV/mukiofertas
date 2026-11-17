// Variações dos vídeos, para eles não ficarem todos iguais.
// A cada vídeo o gerador sorteia um FORMATO (quais cenas e em que ordem), um TEMA de cores e um
// ESTILO de gancho, sem repetir o formato e o tema do vídeo anterior.
//
// Para testar um específico: node gerar.mjs --formato=top3 --tema=roxo
// As cenas existem no template.html: gancho, marca, lojas, tempo, detalhe, ranking, canais, cta.

export const FORMATOS = {
  // o vídeo original, completo (~25 s)
  classico: { cenas: ["gancho", "marca", "lojas", "tempo", "detalhe", "canais", "cta"], nome: "clássico" },
  // ranking das 3 melhores ofertas (~20 s)
  top3: { cenas: ["gancho", "ranking", "marca", "canais", "cta"], nome: "top 3" },
  // vai direto ao produto destaque (~15 s)
  direto: { cenas: ["gancho", "detalhe", "ranking", "cta"], nome: "direto ao ponto" },
  // mostra as lojas e as ofertas chegando no celular (~20 s)
  vitrine: { cenas: ["gancho", "lojas", "tempo", "detalhe", "cta"], nome: "vitrine" },
};

// temas de cor (template.html, body.tema-*)
export const TEMAS = ["azul", "noite", "verde", "roxo"];

// jeito de abrir o vídeo (vai para o roteiro do Gemini)
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
  return { formato: f, cenas: FORMATOS[f].cenas, tema: t, gancho: sortear(ESTILOS_GANCHO, ultimo.gancho) };
}
