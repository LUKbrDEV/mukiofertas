// Aba "Compra em grupo" do painel admin. Salve como app/api/admin/compra-em-grupo/route.js.
// Só administradores (confere pelo eh_admin do banco); grava com a chave de serviço.
//
//   GET                                   → { produtos: [...com grupos abertos] }
//   POST { acao: "adicionar", link, preco_grupo?, link_grupo?, faltam? }
//   POST { acao: "remover_produto", id }  → apaga o produto (e os grupos dele)
//   POST { acao: "remover_grupo", id }    → tira um grupo do mural (status "removido")
//   POST { acao: "preco", id, preco_grupo } → corrige o preço de grupo

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { bancoServidor } from "../../../../lib/conta-da-requisicao.mjs";
import { garantirProduto, criarGrupo, ehLinkAliExpress } from "../../../../lib/grupo-produtos.mjs";
import { normalizarLink } from "../../../../lib/extrair-oferta.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function ehAdmin(request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await db.rpc("eh_admin");
  return !error && data === true;
}

const negar = () => NextResponse.json({ erro: "Só administradores." }, { status: 403 });

export async function GET(request) {
  if (!(await ehAdmin(request))) return negar();
  const db = bancoServidor();
  const [{ data: produtos, error }, { data: grupos }] = await Promise.all([
    db.from("grupos_produtos").select("*").order("atualizado_em", { ascending: false }).limit(300),
    db
      .from("grupos_compra")
      .select("id, produto_id, link, faltam, status, autor_nome, criado_em, expira_em, avisos_fechado")
      .eq("status", "aberto")
      .gt("expira_em", new Date().toISOString())
      .order("criado_em", { ascending: false })
      .limit(500),
  ]);
  if (error) return NextResponse.json({ erro: `${error.message} (rodou o supabase/compra-em-grupo.sql?)` }, { status: 500 });
  const porProduto = new Map();
  for (const g of grupos ?? []) porProduto.set(g.produto_id, [...(porProduto.get(g.produto_id) ?? []), g]);
  return NextResponse.json({
    produtos: (produtos ?? []).map((p) => ({ ...p, grupos: porProduto.get(p.id) ?? [] })),
  });
}

export async function POST(request) {
  if (!(await ehAdmin(request))) return negar();
  const corpo = await request.json().catch(() => ({}));
  const db = bancoServidor();

  if (corpo.acao === "adicionar") {
    const produto = await garantirProduto(db, {
      link: corpo.link,
      precoGrupo: corpo.preco_grupo,
      origem: "admin",
      novoGrupo: Boolean(corpo.link_grupo),
    });
    if (produto.erro) return NextResponse.json({ erro: produto.erro }, { status: 400 });
    if (corpo.link_grupo) {
      const linkGrupo = normalizarLink(corpo.link_grupo);
      if (!linkGrupo || !ehLinkAliExpress(linkGrupo))
        return NextResponse.json({ erro: "Produto salvo, mas o link do grupo não é do AliExpress." }, { status: 400 });
      const g = await criarGrupo(db, { produtoId: produto.produtoId, linkGrupo, faltam: corpo.faltam, autorNome: "MukiOfertas" });
      if (g.erro) return NextResponse.json({ erro: `Produto salvo. Grupo: ${g.erro}` }, { status: 400 });
    }
    return NextResponse.json({ ok: true, produto_id: produto.produtoId, titulo: produto.titulo, novo: produto.novo });
  }

  if (corpo.acao === "remover_produto" && /^\d{6,}$/.test(String(corpo.id ?? ""))) {
    const { error } = await db.from("grupos_produtos").delete().eq("id", String(corpo.id));
    return error ? NextResponse.json({ erro: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (corpo.acao === "remover_grupo" && Number.isInteger(Number(corpo.id))) {
    const { error } = await db.from("grupos_compra").update({ status: "removido" }).eq("id", Number(corpo.id));
    return error ? NextResponse.json({ erro: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (corpo.acao === "preco" && /^\d{6,}$/.test(String(corpo.id ?? ""))) {
    let t = String(corpo.preco_grupo ?? "").replace(/[^\d.,]/g, "");
    if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
    const n = t ? Number(t) : null;
    if (t && !(n > 0)) return NextResponse.json({ erro: "Preço inválido." }, { status: 400 });
    const { error } = await db.from("grupos_produtos").update({ preco_grupo: n }).eq("id", String(corpo.id));
    return error ? NextResponse.json({ erro: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
}
