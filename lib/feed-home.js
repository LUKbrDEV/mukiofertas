// Feed da página inicial: abas (Destaques, Recentes, Menor preço...) e LINHAS de ofertas.
// Salve como lib/feed-home.js. Usado pelo app/page.js e pela rota app/api/feed/route.js.
//
// Como as linhas são montadas:
//   - cada aba tem a sua ordem (Destaques = pontuação da vitrine, Recentes = mais novas etc.)
//   - a primeira oferta ainda não usada abre uma linha; a linha é completada com as próximas
//     ofertas do MESMO departamento (no celular: 1 card na tela, arrasta para o lado para ver as outras)
//   - cada oferta aparece em uma linha só; o feed vai entregando de LINHAS_POR_PAGINA em
//     LINHAS_POR_PAGINA linhas enquanto a pessoa desce a tela (rolagem infinita)
//   - com um departamento escolhido, as linhas passam a ser por subcategoria; na aba Cupons, por loja

import { supabase } from "./supabase";
import { buscarOfertas, buscarConfigHome, PRECO_MINIMO_MELHORES } from "./ofertas";
import {
  regrasDaVitrine,
  escolherComVariedade,
  descontoDe,
  descontoSuspeito,
  maioresDescontos,
  maisBaratos,
  recentesComVariedade,
} from "./vitrine.mjs";
import { temperatura } from "./ordenar";
import { ehRelampago } from "./relampago.mjs";
import { categorias } from "../data/ofertas";

// ===== AJUSTES =====
export const POR_LINHA = 10; // ofertas em cada linha (carrossel)
export const LINHAS_POR_PAGINA = 6; // linhas entregues a cada vez que a pessoa chega perto do fim
const HORAS_RECENTES = 3; // o número em "Recentes" = ofertas que entraram nas últimas X horas
const CACHE_MS = 5 * 60 * 1000; // as listas são montadas no máximo 1 vez a cada 5 minutos (economiza o limite do Supabase)
// ===================

const PAI = Object.fromEntries(categorias.map((c) => [c.slug, c.pai ?? c.slug]));
const INFO = Object.fromEntries(categorias.map((c) => [c.slug, { nome: c.nome, emoji: c.emoji }]));
export const departamentoDe = (o) => PAI[o.categoria] ?? o.categoria ?? "outros";
export const infoDaCategoria = (slug) => INFO[slug] ?? null;

export const ABAS = [
  { id: "destaques", rotulo: "Destaques", icone: "estrela", descricao: "Desconto real, marcas conhecidas e lojas confiáveis." },
  { id: "recentes", rotulo: "Recentes", icone: "relogio", descricao: "As ofertas que acabaram de chegar." },
  { id: "menor-preco", rotulo: "Menor preço", icone: "queda", descricao: "Do mais barato para o mais caro, só com desconto de verdade." },
  { id: "descontos", rotulo: "Maior desconto", icone: "porcento", descricao: "Os maiores cortes de preço, sem desconto inflado." },
  { id: "com-cupom", rotulo: "Com cupom", icone: "cupom", descricao: "Produtos com cupom: copie o código e use no carrinho." },
];
export const POR_PAGINA_GRADE = 24; // computador: cards entregues por vez na grade

// Só os campos que o card usa (a resposta da rota fica leve)
const CAMPOS_DO_CARD = [
  "id", "titulo", "loja", "imagem", "categoria", "preco_atual", "preco_antigo", "preco_pix", "cupom",
  "frete_gratis", "publicada_em", "atualizado_em", "cliques", "super_desconto", "relampago_ate", "nota", "autor", "menor_preco_30", "likes", "dislikes",
];
export const enxugar = (o) => Object.fromEntries(CAMPOS_DO_CARD.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));

const maisNova = (a, b) => new Date(b.publicada_em ?? 0) - new Date(a.publicada_em ?? 0);

// ---------- Listas de cada aba (com cache de 1 minuto) ----------
let cache = null;
async function listas() {
  if (cache && Date.now() - cache.em < CACHE_MS) return cache.dados;

  const [todas, cuponsNoAr, config] = await Promise.all([
    buscarOfertas({ limite: 1000, limiteExpiradas: 0, comComunidade: true }),
    buscarOfertas({ categoria: "cupons", ordem: "recentes", limite: 300, limiteExpiradas: 0 }),
    buscarConfigHome(),
  ]);
  const r = regrasDaVitrine(config);
  const noAr = todas.filter((o) => !o.expirada && o.categoria !== "cupons");
  const comDesconto = noAr.filter((o) => descontoDe(o) > 0);
  const semLimite = { maxPorCategoria: Infinity, maxPorLoja: Infinity };

  // Destaques: fixadas no painel, depois a pontuação da vitrine; o resto entra no fim (mais novas primeiro)
  const fixadas = noAr.filter((o) => o.fixada_home).sort((a, b) => (a.fixada_ordem ?? 999) - (b.fixada_ordem ?? 999));
  const pontuadas = escolherComVariedade(noAr.filter((o) => !o.fixada_home), r, { maximo: Infinity, ...semLimite });
  const destaques = juntarSemRepetir(fixadas, pontuadas, [...noAr].sort(maisNova));

  const dados = {
    destaques,
    relampago: noAr.filter((o) => ehRelampago(o)).sort((a, b) => new Date(a.relampago_ate) - new Date(b.relampago_ate)),
    recentes: [...noAr].sort(maisNova),
    "menor-preco": comDesconto
      .filter((o) => Number(o.preco_atual) >= 10 && !descontoSuspeito(o, r))
      .sort((a, b) => Number(a.preco_atual) - Number(b.preco_atual)),
    // (mesmo filtro do maioresDescontos da vitrine, mas sem o limite de 2 por categoria)
    descontos: comDesconto
      .filter((o) => Number(o.preco_atual) >= 30 && !descontoSuspeito(o, r))
      .sort((a, b) => descontoDe(b) - descontoDe(a) || (Number(b.cliques) || 0) - (Number(a.cliques) || 0)),
    quentes: [...comDesconto].sort((a, b) => temperatura(b) - temperatura(a)),
    cupons: cuponsNoAr.filter((o) => !o.expirada),
    // produtos com código de cupom (os melhores primeiro, na ordem dos Destaques)
    "com-cupom": destaques.filter((o) => o.cupom),
  };

  // Cupons do dia (coluna da direita): os mais novos, no máximo 1 por loja
  const lojasVistas = new Set();
  const cuponsDoDia = [];
  for (const o of dados.cupons) {
    const loja = String(o.loja).toLowerCase();
    if (lojasVistas.has(loja)) continue;
    lojasVistas.add(loja);
    cuponsDoDia.push({ id: o.id, loja: o.loja, titulo: o.titulo, cupom: o.cupom ?? null });
    if (cuponsDoDia.length >= 4) break;
  }

  // Números das abas e departamentos que têm ofertas (para os botões de filtro)
  const desde = Date.now() - HORAS_RECENTES * 3600000;
  const contagem = {};
  for (const o of noAr) contagem[departamentoDe(o)] = (contagem[departamentoDe(o)] ?? 0) + 1;
  const departamentos = Object.entries(contagem)
    .filter(([slug]) => INFO[slug])
    .sort((a, b) => b[1] - a[1])
    .map(([slug, total]) => ({ slug, nome: INFO[slug].nome, emoji: INFO[slug].emoji, total }));

  cache = {
    em: Date.now(),
    dados: {
      listas: dados,
      departamentos,
      cuponsDoDia,
      novas: noAr.filter((o) => new Date(o.publicada_em ?? 0).getTime() >= desde).length,
      regras: r,
      noAr,
    },
  };
  return cache.dados;
}

function juntarSemRepetir(...grupos) {
  const vistos = new Set();
  const lista = [];
  for (const g of grupos)
    for (const o of g) {
      if (vistos.has(o.id)) continue;
      vistos.add(o.id);
      lista.push(o);
    }
  return lista;
}

// ---------- Linhas ----------
// A ordem da aba manda: a primeira oferta ainda livre abre a linha, e a linha leva as próximas
// livres do mesmo grupo (departamento, subcategoria ou loja), na mesma ordem.
function montarLinhas(lista, grupoDe) {
  const porGrupo = new Map();
  for (const o of lista) {
    const g = grupoDe(o);
    if (!porGrupo.has(g)) porGrupo.set(g, []);
    porGrupo.get(g).push(o);
  }
  const usados = new Set();
  const ponteiro = new Map();
  const linhas = [];
  for (const o of lista) {
    if (usados.has(o.id)) continue;
    const g = grupoDe(o);
    const doGrupo = porGrupo.get(g);
    let i = ponteiro.get(g) ?? 0;
    const ofertas = [];
    while (i < doGrupo.length && ofertas.length < POR_LINHA) {
      const x = doGrupo[i++];
      if (usados.has(x.id)) continue;
      usados.add(x.id);
      ofertas.push(x);
    }
    ponteiro.set(g, i);
    linhas.push({ grupo: g, ofertas });
  }
  return linhas;
}

const linhasEmCache = new Map(); // "aba|depto" -> { em, linhas }

async function linhasDa(aba, depto) {
  const { listas: dados } = await listas();
  const chave = `${aba}|${depto || ""}`;
  const guardada = linhasEmCache.get(chave);
  if (guardada && guardada.em === cache.em) return guardada.linhas;

  let lista = dados[aba] ?? dados.destaques;
  if (depto && aba !== "cupons") lista = lista.filter((o) => departamentoDe(o) === depto);
  const grupoDe =
    aba === "cupons" ? (o) => `loja:${o.loja}` : depto ? (o) => o.categoria ?? depto : (o) => departamentoDe(o);
  const linhas = montarLinhas(lista, grupoDe).map((l) => {
    const slug = l.grupo.startsWith("loja:") ? null : l.grupo;
    return {
      chave: `${l.grupo}-${l.ofertas[0].id}`,
      titulo: l.grupo.startsWith("loja:") ? `Cupons ${l.grupo.slice(5)}` : INFO[slug]?.nome ?? "Outras ofertas",
      emoji: slug ? INFO[slug]?.emoji ?? "🛍️" : "🎟️",
      href: slug && INFO[slug] ? `/categoria/${slug}` : aba === "cupons" ? "/cupons-de-desconto" : null,
      ofertas: l.ofertas,
    };
  });
  linhasEmCache.set(chave, { em: cache.em, linhas });
  return linhas;
}

// Quantos comentários cada oferta tem (para o "💬 4" do card)
export async function contarComentarios(ids) {
  if (!ids.length) return {};
  try {
    const { data } = await supabase.from("comentarios").select("oferta_id").in("oferta_id", ids).limit(5000);
    const conta = {};
    for (const c of data ?? []) conta[c.oferta_id] = (conta[c.oferta_id] ?? 0) + 1;
    return conta;
  } catch {
    return {};
  }
}

// Uma "página" do feed: LINHAS_POR_PAGINA linhas a partir da página pedida
export async function paginaDoFeed({ aba = "destaques", depto = null, pagina = 0 } = {}) {
  const abaValida = ABAS.some((a) => a.id === aba) ? aba : "destaques";
  const todas = await linhasDa(abaValida, depto);
  const inicio = Math.max(0, pagina) * LINHAS_POR_PAGINA;
  const trecho = todas.slice(inicio, inicio + LINHAS_POR_PAGINA);
  const comentarios = await contarComentarios(trecho.flatMap((l) => l.ofertas.map((o) => o.id)));
  return {
    aba: abaValida,
    depto: depto || null,
    pagina,
    temMais: inicio + LINHAS_POR_PAGINA < todas.length,
    linhas: trecho.map((l) => ({
      ...l,
      ofertas: l.ofertas.map((o) => ({ ...enxugar(o), comentarios: comentarios[o.id] ?? 0 })),
    })),
  };
}

// Computador: a lista da aba em grade (sem linhas), de POR_PAGINA_GRADE em POR_PAGINA_GRADE
export async function paginaDaGrade({ aba = "destaques", depto = null, pagina = 0 } = {}) {
  const { listas: dados } = await listas();
  const abaValida = ABAS.some((a) => a.id === aba) ? aba : "destaques";
  let lista = dados[abaValida] ?? dados.destaques;
  if (depto) lista = lista.filter((o) => departamentoDe(o) === depto);
  const inicio = Math.max(0, pagina) * POR_PAGINA_GRADE;
  const trecho = lista.slice(inicio, inicio + POR_PAGINA_GRADE);
  const comentarios = await contarComentarios(trecho.map((o) => o.id));
  return {
    aba: abaValida,
    depto: depto || null,
    pagina,
    temMais: inicio + POR_PAGINA_GRADE < lista.length,
    ofertas: trecho.map((o) => ({ ...enxugar(o), comentarios: comentarios[o.id] ?? 0 })),
  };
}

// Tudo que a página inicial precisa para abrir já com o feed na tela
// (o servidor manda as duas versões: linhas para o celular e grade para o computador)
export async function inicioDoFeed() {
  const { listas: dados, departamentos, novas, cuponsDoDia } = await listas();
  const abas = ABAS.filter((a) => (dados[a.id]?.length ?? 0) > 0).map((a) => ({
    ...a,
    contador: a.id === "recentes" && novas > 0 ? novas : null,
  }));
  const primeiraAba = abas[0]?.id ?? "destaques";
  const [primeira, primeiraGrade] = await Promise.all([
    paginaDoFeed({ aba: primeiraAba }),
    paginaDaGrade({ aba: primeiraAba }),
  ]);
  return { abas, departamentos, primeira, primeiraGrade, cuponsDoDia };
}

// ---------- Carrosséis do topo da página inicial ----------
// 5 linhas com setas e passagem automática, ANTES das abas (Destaques, Recentes...).
// Mesmo esquema dos carrosséis antigos: as regras da vitrine (lib/vitrine.mjs) escolhem os melhores
// produtos, com variedade de loja e categoria, e cada oferta aparece em um carrossel só.
// Variam com o tempo:
//   - a pontuação perde força conforme a oferta envelhece (depois de 12 h no ar)
//   - "Melhores do momento" só pega ofertas das últimas home_horas_destaque horas (48 h, ajustável no painel)
//   - rodízio por hora: os FIXOS_NO_TOPO melhores ficam na frente e o resto do carrossel troca a cada hora
//   - a lista é refeita a cada 5 minutos (mesmo cache do feed)

// ===== AJUSTES DOS CARROSSÉIS =====
export const TOTAL_CARROSSEIS = 5; // quantos carrosséis aparecem
const POR_CARROSSEL = 12; // ofertas em cada carrossel
const FIXOS_NO_TOPO = 4; // os X melhores ficam sempre na frente; os outros entram no rodízio de 1 hora
const MINIMO_PARA_MOSTRAR = 4; // carrossel com menos ofertas que isso é pulado (entra o próximo da lista)
// ==================================

// Rodízio: dos candidatos (já em ordem de pontuação), os primeiros ficam fixos e o resto
// "anda" uma janela por hora. Depois volta para a ordem da pontuação (o melhor sempre na frente).
function rodizioPorHora(candidatos, semente = 0) {
  if (candidatos.length <= POR_CARROSSEL) return candidatos;
  const fixos = candidatos.slice(0, FIXOS_NO_TOPO);
  const giro = candidatos.slice(FIXOS_NO_TOPO);
  const vagas = POR_CARROSSEL - FIXOS_NO_TOPO;
  const hora = Math.floor(Date.now() / 3600000) + semente;
  const inicio = (hora * vagas) % giro.length;
  const escolhidos = [...giro.slice(inicio), ...giro.slice(0, inicio)].slice(0, vagas);
  const posicao = new Map(candidatos.map((o, i) => [o.id, i]));
  return [...fixos, ...escolhidos.sort((a, b) => posicao.get(a.id) - posicao.get(b.id))];
}

let carrosseisEmCache = null; // { em, carrosseis }

export async function carrosseisDaHome() {
  const { listas: dados, regras: r, noAr } = await listas();
  if (carrosseisEmCache && carrosseisEmCache.em === cache.em) return carrosseisEmCache.carrosseis;

  const usados = new Set(); // cada oferta entra em um carrossel só
  const livres = (lista) => lista.filter((o) => !usados.has(o.id));
  const candidatos = POR_CARROSSEL * 2; // de onde sai o rodízio

  // Na ordem de prioridade: os primeiros TOTAL_CARROSSEIS que tiverem ofertas suficientes aparecem
  const definicoes = [
    {
      id: "melhores",
      emoji: "🔥",
      titulo: "Melhores ofertas do momento",
      descricao: "Desconto real, marcas conhecidas e o que a galera está clicando.",
      href: "/mais-procuradas",
      girar: true,
      escolher: () => {
        const fixadas = livres(noAr.filter((o) => o.fixada_home)).sort(
          (a, b) => (a.fixada_ordem ?? 999) - (b.fixada_ordem ?? 999)
        );
        const opcoes = { maximo: candidatos, horas: r.home_horas_destaque, ignorar: usados };
        let pontuadas = escolherComVariedade(
          noAr.filter((o) => Number(o.preco_atual) >= PRECO_MINIMO_MELHORES),
          r,
          opcoes
        );
        // poucas ofertas caras no ar: libera o preço mínimo
        if (pontuadas.length < MINIMO_PARA_MOSTRAR) pontuadas = escolherComVariedade(noAr, r, opcoes);
        return juntarSemRepetir(fixadas, pontuadas);
      },
    },
    {
      id: "relampago",
      emoji: "⚡",
      titulo: "Promoções relâmpago",
      descricao: "Tempo limitado: as que acabam primeiro aparecem na frente.",
      href: "/relampago",
      girar: false,
      escolher: () => livres(dados.relampago ?? []).slice(0, POR_CARROSSEL),
    },
    {
      id: "descontos",
      emoji: "💸",
      titulo: "Maiores descontos",
      descricao: "Os maiores cortes de preço, sem desconto inflado.",
      href: "/maiores-descontos",
      girar: true,
      escolher: () => maioresDescontos(noAr, r, { maximo: candidatos, ignorar: usados }),
    },
    {
      id: "baratos",
      emoji: "🪙",
      titulo: "Até R$ 100 com desconto de verdade",
      descricao: "Do mais barato para o mais caro, só com desconto acima de 20%.",
      href: "/mais-baratos",
      girar: true,
      escolher: () => maisBaratos(noAr, r, { maximo: candidatos, ignorar: usados }),
    },
    {
      id: "recentes",
      emoji: "🆕",
      titulo: "Acabaram de chegar",
      descricao: "As ofertas mais novas, de várias lojas.",
      href: "/recentes",
      girar: false,
      escolher: () => recentesComVariedade(noAr, r, { maximo: POR_CARROSSEL, ignorar: usados }),
    },
    // reserva: entra se algum dos de cima estiver vazio (ex.: nenhuma relâmpago no ar)
    {
      id: "com-cupom",
      emoji: "🎟️",
      titulo: "Ofertas com cupom",
      descricao: "Copie o código e use no carrinho.",
      href: "/cupons-de-desconto",
      girar: false,
      escolher: () => livres(dados["com-cupom"] ?? []).slice(0, POR_CARROSSEL),
    },
  ];

  const escolhidos = [];
  for (const [i, d] of definicoes.entries()) {
    if (escolhidos.length >= TOTAL_CARROSSEIS) break;
    let ofertas = d.escolher();
    if (ofertas.length < MINIMO_PARA_MOSTRAR) continue;
    ofertas = d.girar ? rodizioPorHora(ofertas, i) : ofertas.slice(0, POR_CARROSSEL);
    ofertas.forEach((o) => usados.add(o.id));
    escolhidos.push({ id: d.id, emoji: d.emoji, titulo: d.titulo, descricao: d.descricao, href: d.href, ofertas });
  }

  const comentarios = await contarComentarios(escolhidos.flatMap((c) => c.ofertas.map((o) => o.id)));
  const carrosseis = escolhidos.map((c) => ({
    ...c,
    ofertas: c.ofertas.map((o) => ({ ...enxugar(o), comentarios: comentarios[o.id] ?? 0 })),
  }));
  carrosseisEmCache = { em: cache.em, carrosseis };
  return carrosseis;
}
