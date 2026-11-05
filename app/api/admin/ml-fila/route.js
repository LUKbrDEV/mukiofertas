// Fila do Mercado Livre no painel admin.
// Salve como app/api/admin/ml-fila/route.js
//   GET  → ofertas que esperam o link de afiliado
//   POST { acao: "publicar", itens: [{ id, link }] }  → publica no site com o link de afiliado
//   POST { acao: "descartar", ids: [..] }             → tira da fila
// Só administradores conseguem usar.

import { createClient } from "@supabase/supabase-js";
import { DIAS_NO_SITE } from "../../../../lib/prazos.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

const banco = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Link de afiliado do Mercado Livre: meli.la (curto) ou mercadolivre.com.br (completo)
const LINK_ML = /^https?:\/\/(meli\.la|([a-z0-9-]+\.)?mercadolivre\.com(\.br)?|([a-z0-9-]+\.)?mercadolibre\.com)\//i;

export async function GET(request) {
  if (!(await ehAdmin(request))) return Response.json({ erro: "Somente administradores." }, { status: 403 });
  const { data, error } = await banco()
    .from("ml_fila")
    .select("*")
    .eq("status", "pendente")
    .order("desconto", { ascending: false })
    .limit(200);
  if (error) {
    const falta = /ml_fila/.test(error.message);
    return Response.json(
      { erro: falta ? "Rode o fila-mercadolivre.sql no Supabase para criar a fila." : error.message },
      { status: 500 }
    );
  }
  return Response.json({ itens: data ?? [] });
}

export async function POST(request) {
  if (!(await ehAdmin(request))) return Response.json({ erro: "Somente administradores." }, { status: 403 });
  const corpo = await request.json().catch(() => ({}));
  const db = banco();
  const agora = new Date();

  if (corpo.acao === "descartar") {
    const ids = (corpo.ids ?? []).map(Number).filter(Boolean);
    if (!ids.length) return Response.json({ erro: "Nenhuma oferta escolhida." }, { status: 400 });
    await db.from("ml_fila").update({ status: "descartada", atualizado_em: agora.toISOString() }).in("id", ids);
    return Response.json({ ok: true, mensagem: `${ids.length} oferta(s) descartada(s).` });
  }

  if (corpo.acao !== "publicar") return Response.json({ erro: "Ação desconhecida." }, { status: 400 });

  const itens = (corpo.itens ?? []).filter((i) => i?.id && i?.link);
  if (!itens.length) return Response.json({ erro: "Nenhum link para publicar." }, { status: 400 });
  const ruins = itens.filter((i) => !LINK_ML.test(String(i.link).trim()));
  if (ruins.length)
    return Response.json(
      { erro: `${ruins.length} link(s) não são do Mercado Livre (ex.: ${String(ruins[0].link).slice(0, 60)}). Nada foi publicado.` },
      { status: 400 }
    );

  const { data: fila } = await db.from("ml_fila").select("*").in("id", itens.map((i) => i.id)).eq("status", "pendente");
  const porId = new Map((fila ?? []).map((f) => [f.id, f]));

  let publicadas = 0;
  const problemas = [];
  for (const { id, link } of itens) {
    const f = porId.get(id);
    if (!f) {
      problemas.push(`#${id}: não está mais na fila`);
      continue;
    }
    const idExterno = `ml-${f.produto_id}`;
    const campos = {
      loja: "Mercado Livre",
      id_externo: idExterno,
      titulo: f.titulo,
      categoria: f.categoria,
      preco_atual: f.preco_atual,
      preco_antigo: f.preco_antigo,
      link: String(link).trim(),
      imagem: f.imagem,
      origem: "automatica",
      ativa: true,
      publicada_em: agora.toISOString(),
      atualizado_em: agora.toISOString(),
      preco_conferido_em: agora.toISOString(),
      expires_at: new Date(agora.getTime() + DIAS_NO_SITE * 86400000).toISOString(),
    };
    // Se a oferta já existiu (expirada), reaproveita a mesma linha
    const { data: existente } = await db.from("ofertas").select("id").eq("id_externo", idExterno).maybeSingle();
    const { data: salva, error } = existente
      ? await db.from("ofertas").update({ ...campos, postada_telegram_em: null, renovacoes: 0 }).eq("id", existente.id).select("id").maybeSingle()
      : await db.from("ofertas").insert(campos).select("id").maybeSingle();
    if (error) {
      problemas.push(`${f.titulo.slice(0, 40)}: ${error.message}`);
      continue;
    }
    await db.from("ml_fila").update({ status: "publicada", oferta_id: salva?.id ?? null, atualizado_em: agora.toISOString() }).eq("id", id);
    publicadas++;
  }

  return Response.json({
    ok: publicadas > 0,
    mensagem:
      `${publicadas} oferta(s) publicada(s) no site.` +
      (problemas.length ? ` ${problemas.length} com problema: ${problemas.slice(0, 3).join(" | ")}` : ""),
  });
}
