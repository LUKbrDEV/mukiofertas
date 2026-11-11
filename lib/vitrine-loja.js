// Página de uma loja (/loja/mercado-livre): TODAS as ofertas da loja, com filtro por departamento
// (só os departamentos que a loja tem) e ordenação. A lista é entregue aos poucos (rolagem infinita).
// Salve como lib/vitrine-loja.js. Usado pelo app/loja/[slug]/page.js e pela rota app/api/loja/route.js.
//
// A mesma loja pode vir com nomes diferentes de cada rede ("KaBuM!" e "Kabum BR", "AliExpress" e
// "Aliexpress BR & LATAM"): as lojas do data/lojas.js juntam todos esses nomes numa loja só.

import { supabase } from "./supabase";
import { buscarLojasComCategorias, estaExpirada, slugDaLoja, semCuponsRepetidos, DIAS_NO_SITE } from "./ofertas";
import { lojaDoNome } from "../data/lojas";
import { temperatura } from "./ordenar";
import { departamentoDe, infoDaCategoria, enxugar, contarComentarios } from "./feed-home";

// ===== AJUSTES =====
export const POR_PAGINA = 30; // ofertas entregues a cada vez que a pessoa chega perto do fim
const CACHE_MS = 60 * 1000;
// ===================

export const ORDENS = [
  { valor: "recentes", nome: "Mais recentes" },
  { valor: "em-alta", nome: "Em alta" },
  { valor: "maior-desconto", nome: "Maior desconto" },
  { valor: "menor-preco", nome: "Menor preço" },
  { valor: "maior-preco", nome: "Maior preço" },
];

const CAMPOS =
  "id, titulo, loja, imagem, categoria, preco_atual, preco_antigo, preco_pix, cupom, frete_gratis, publicada_em, " +
  "atualizado_em, cliques, super_desconto, relampago_ate, nota, autor, likes, dislikes, expires_at";

// Lojas com ofertas no ar, juntando os nomes da mesma loja: [{ nome, slug, total, nomes }]
// A contagem usa a MESMA regra da lista da loja (no ar = publicada nos últimos dias e ainda não vencida),
// para o número da aba bater com o "Todos (N)" do campo de departamento.
// (Antes vinha da view lojas_com_ofertas, que também contava as ofertas já marcadas como "Expirado".)
let cacheLojas = null;
export async function lojasAgrupadas() {
  if (cacheLojas && Date.now() - cacheLojas.em < CACHE_MS) return cacheLojas.lista;
  const grupos = new Map();
  for (const l of await buscarLojasComCategorias()) {
    const cfg = lojaDoNome(l.nome);
    const slug = cfg?.slug ?? slugDaLoja(l.nome);
    const g = grupos.get(slug) ?? { nome: cfg?.nome ?? l.nome, slug, total: 0, nomes: [] };
    g.total += Number(l.total) || 0;
    g.nomes.push(l.nome);
    grupos.set(slug, g);
  }
  const lista = [...grupos.values()].sort((a, b) => b.total - a.total);
  cacheLojas = { em: Date.now(), lista };
  return lista;
}

// Todas as ofertas no ar da loja (em páginas de 1000, o máximo do Supabase por consulta)
async function ofertasDaLoja(nomes) {
  const agora = new Date().toISOString();
  const corte = new Date(Date.now() - DIAS_NO_SITE * 86400000).toISOString();
  const lista = [];
  let campos = CAMPOS;
  for (let de = 0; de < 20000; de += 1000) {
    const { data, error } = await supabase
      .from("ofertas")
      .select(campos)
      .eq("ativa", true)
      .in("loja", nomes)
      .or("origem.is.null,origem.neq.comunidade") // igual à contagem das abas (comunidade tem a aba dela)
      .or(`expires_at.is.null,expires_at.gt.${agora}`)
      .or(`publicada_em.is.null,publicada_em.gt.${corte}`)
      .order("publicada_em", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .range(de, de + 999);
    if (error) {
      // alguma coluna da lista não existe no banco: tenta de novo com todas as colunas
      if (campos !== "*") {
        campos = "*";
        de -= 1000;
        continue;
      }
      console.error("Erro ao buscar as ofertas da loja:", error.message);
      break;
    }
    lista.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return semCuponsRepetidos(lista.filter((o) => !estaExpirada(o)));
}

const cache = new Map(); // slug -> { em, loja, ofertas, departamentos }

export async function dadosDaLoja(slug) {
  const guardado = cache.get(slug);
  if (guardado && Date.now() - guardado.em < CACHE_MS) return guardado;

  const loja = (await lojasAgrupadas()).find((l) => l.slug === slug);
  if (!loja) return null;
  const ofertas = await ofertasDaLoja(loja.nomes);

  // Departamentos que a loja tem, do que tem mais ofertas para o que tem menos (Cupons no fim)
  const conta = {};
  for (const o of ofertas) {
    const d = o.categoria === "cupons" ? "cupons" : departamentoDe(o);
    conta[d] = (conta[d] ?? 0) + 1;
  }
  const departamentos = Object.entries(conta)
    .map(([slugDepto, total]) => {
      if (slugDepto === "cupons") return { slug: "cupons", nome: "Cupons", emoji: "🎟️", total, fim: true };
      const info = infoDaCategoria(slugDepto);
      return { slug: slugDepto, nome: info?.nome ?? "Outros", emoji: info?.emoji ?? "🛍️", total };
    })
    .sort((a, b) => Number(Boolean(a.fim)) - Number(Boolean(b.fim)) || b.total - a.total);

  const dados = { em: Date.now(), loja: { ...loja, total: ofertas.length }, ofertas, departamentos };
  cache.set(slug, dados);
  return dados;
}

const preco = (o) => Number(o.preco_atual) || 0;
const desconto = (o) => {
  const a = Number(o.preco_antigo);
  return a > preco(o) && preco(o) > 0 ? (a - preco(o)) / a : 0;
};
const COMPARAR = {
  "em-alta": (a, b) => temperatura(b) - temperatura(a),
  "maior-desconto": (a, b) => desconto(b) - desconto(a),
  "menor-preco": (a, b) => preco(a) - preco(b),
  "maior-preco": (a, b) => preco(b) - preco(a),
};

// Uma "página" da vitrine da loja
export async function paginaDaLoja({ slug, depto = null, ordem = "recentes", pagina = 0 }) {
  const dados = await dadosDaLoja(slug);
  if (!dados) return null;
  const ordemValida = ORDENS.some((o) => o.valor === ordem) ? ordem : "recentes";
  const deptoValido = dados.departamentos.some((d) => d.slug === depto) ? depto : null;

  let lista = dados.ofertas;
  if (deptoValido === "cupons") lista = lista.filter((o) => o.categoria === "cupons");
  else if (deptoValido) lista = lista.filter((o) => o.categoria !== "cupons" && departamentoDe(o) === deptoValido);
  // sem departamento escolhido: produtos primeiro, cupons no fim
  else lista = [...lista.filter((o) => o.categoria !== "cupons"), ...lista.filter((o) => o.categoria === "cupons")];
  if (COMPARAR[ordemValida]) {
    const comparar = COMPARAR[ordemValida];
    lista = [...lista].sort((a, b) => Number(a.categoria === "cupons") - Number(b.categoria === "cupons") || comparar(a, b));
  }

  const inicio = Math.max(0, pagina) * POR_PAGINA;
  const trecho = lista.slice(inicio, inicio + POR_PAGINA);
  const comentarios = await contarComentarios(trecho.map((o) => o.id));
  return {
    depto: deptoValido,
    ordem: ordemValida,
    pagina,
    total: lista.length,
    temMais: inicio + POR_PAGINA < lista.length,
    ofertas: trecho.map((o) => ({ ...enxugar(o), comentarios: comentarios[o.id] ?? 0 })),
  };
}
