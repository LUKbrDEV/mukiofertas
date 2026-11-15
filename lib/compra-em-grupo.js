// Compra em grupo (grupo de 3 do AliExpress): leitura dos produtos e grupos para as páginas.
// Salve como lib/compra-em-grupo.js. Tabelas: supabase/compra-em-grupo.sql.

import { supabase } from "./supabase";

const agoraIso = () => new Date().toISOString();

// Link de grupo aceito: só do AliExpress (a.aliexpress.com/_xxxx, s.click..., pt.aliexpress.com...)
export function ehLinkAliExpress(link) {
  try {
    const h = new URL(link).hostname.toLowerCase();
    return h === "aliexpress.com" || h.endsWith(".aliexpress.com") || h.endsWith(".aliexpress.us");
  } catch {
    return false;
  }
}

export const textoFaltam = (n) => (n <= 0 ? "Grupo completo" : n === 1 ? "Falta 1 pessoa" : `Faltam ${n} pessoas`);

export const slugTitulo = (t) =>
  String(t ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export const linkDoProduto = (p) => `/compra-em-grupo/p/${p.id}${p.titulo ? `/${slugTitulo(p.titulo)}` : ""}`;

// Grupos abertos (não fechados e dentro das 24h), de um produto ou de todos
async function gruposAbertos(produtoId = null) {
  let q = supabase
    .from("grupos_compra")
    .select("id, produto_id, link, faltam, autor_nome, criado_em, expira_em")
    .eq("status", "aberto")
    .gt("faltam", 0)
    .gt("expira_em", agoraIso())
    .order("faltam", { ascending: true }) // "falta 1 pessoa" primeiro: fecham mais rápido
    .order("criado_em", { ascending: false })
    .limit(produtoId ? 50 : 2000);
  if (produtoId) q = q.eq("produto_id", produtoId);
  const { data, error } = await q;
  if (error) {
    console.error("Erro ao buscar grupos:", error.message);
    return [];
  }
  return data ?? [];
}

// "Para abrir grupo": os que mais tiveram grupos primeiro (fecham fácil), depois os que têm preço
// de grupo conhecido, depois os mais recentes
export const ordenarParaAbrir = (lista) =>
  [...lista].sort(
    (a, b) =>
      (b.grupos_criados ?? 0) - (a.grupos_criados ?? 0) ||
      Number(Boolean(b.preco_grupo)) - Number(Boolean(a.preco_grupo)) ||
      new Date(b.atualizado_em) - new Date(a.atualizado_em)
  );

// Lista da página /compra-em-grupo
// aba: "abertos" (só produtos com grupo aberto) | "abrir" (sem grupo aberto) | "todos"
export async function listarProdutosDeGrupo({ aba = "abertos", categorias = null } = {}) {
  const [grupos, { data: produtos, error }] = await Promise.all([
    gruposAbertos(),
    supabase
      .from("grupos_produtos")
      .select("id, titulo, imagem, categoria, preco_normal, preco_grupo, grupos_criados, atualizado_em")
      .order("atualizado_em", { ascending: false })
      .limit(500),
  ]);
  if (error) {
    console.error("Erro ao buscar produtos de grupo:", error.message);
    return { produtos: [], erro: error.message };
  }

  const porProduto = new Map();
  for (const g of grupos) {
    const lista = porProduto.get(g.produto_id) ?? [];
    lista.push(g);
    porProduto.set(g.produto_id, lista);
  }

  let lista = (produtos ?? []).map((p) => {
    const abertos = porProduto.get(p.id) ?? [];
    return {
      ...p,
      abertos: abertos.length,
      menorFaltam: abertos.length ? Math.min(...abertos.map((g) => g.faltam)) : null,
      // o grupo mais perto de fechar (para o botão "Entrar" direto no card)
      grupoMaisPerto: abertos[0] ?? null,
    };
  });
  if (categorias?.length) lista = lista.filter((p) => categorias.includes(p.categoria));
  if (aba === "abertos") lista = lista.filter((p) => p.abertos > 0);
  if (aba === "abrir") {
    // "Para abrir grupo": sem grupo aberto agora. Primeiro os que mais tiveram grupos (fecham fácil),
    // depois os que têm preço de grupo conhecido, depois os mais recentes.
    return {
      produtos: ordenarParaAbrir(lista.filter((p) => p.abertos === 0)),
      totalAbertos: grupos.length,
    };
  }

  // abertos primeiro (falta 1 pessoa na frente), depois os mais recentes
  lista.sort(
    (a, b) =>
      Number(b.abertos > 0) - Number(a.abertos > 0) ||
      (a.menorFaltam ?? 9) - (b.menorFaltam ?? 9) ||
      new Date(b.atualizado_em) - new Date(a.atualizado_em)
  );
  return { produtos: lista, totalAbertos: grupos.length };
}

// Página de um produto: dados + grupos abertos
export async function buscarProdutoDeGrupo(id) {
  if (!/^\d{6,}$/.test(String(id))) return null;
  const { data, error } = await supabase.from("grupos_produtos").select("*").eq("id", String(id)).maybeSingle();
  if (error || !data) return null;
  const grupos = await gruposAbertos(data.id);
  return { ...data, grupos };
}

// "Você também pode gostar": outros produtos com grupo aberto (da mesma categoria primeiro)
export async function produtosParecidos(produto, maximo = 5) {
  const { produtos } = await listarProdutosDeGrupo({ aba: "todos" });
  return produtos
    .filter((p) => p.id !== produto.id)
    .sort(
      (a, b) =>
        Number(b.categoria === produto.categoria) - Number(a.categoria === produto.categoria) ||
        Number(b.abertos > 0) - Number(a.abertos > 0)
    )
    .slice(0, maximo);
}
