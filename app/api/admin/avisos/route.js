// Avisos da comunidade e alertas de preço para o painel admin (aba "Avisos e alertas").
// Salve como app/api/admin/avisos/route.js
//
//   GET → { avisos: [...], alertas: {...} }
//     avisos:  botão "O preço subiu ou a oferta acabou?" / "O cupom não funcionou?" dos últimos 7 dias,
//              agrupados por oferta (quantas pessoas diferentes avisaram)
//     alertas: alertas de preço que os membros criaram (termos mais pedidos e os mais recentes).
//              Nenhum e-mail ou dado pessoal sai daqui.
// Só administradores conseguem usar (lê com a chave de serviço, por isso não depende das regras do banco).

import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const DIAS = 7;

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

async function lerAvisos(db) {
  const desde = new Date(Date.now() - DIAS * 86400000).toISOString();
  const { data, error } = await db
    .from("avisos_preco")
    .select("oferta_id, visitante_ip, criado_em")
    .gte("criado_em", desde)
    .order("criado_em", { ascending: false })
    .limit(3000);
  if (error) return { erro: `Avisos indisponíveis (${error.message}). Rode o validade.sql no Supabase.` };

  const porOferta = new Map();
  for (const a of data ?? []) {
    const g = porOferta.get(a.oferta_id) ?? { oferta_id: a.oferta_id, pessoas: new Set(), ultimo: a.criado_em };
    g.pessoas.add(a.visitante_ip);
    if (a.criado_em > g.ultimo) g.ultimo = a.criado_em;
    porOferta.set(a.oferta_id, g);
  }
  const ids = [...porOferta.keys()];
  const ofertas = new Map();
  for (let i = 0; i < ids.length; i += 200) {
    const { data: lote } = await db
      .from("ofertas")
      .select("id, titulo, loja, preco_atual, cupom, imagem, ativa, expires_at")
      .in("id", ids.slice(i, i + 200));
    for (const o of lote ?? []) ofertas.set(o.id, o);
  }
  const lista = [...porOferta.values()]
    .map((g) => ({ oferta_id: g.oferta_id, pessoas: g.pessoas.size, ultimo: g.ultimo, oferta: ofertas.get(g.oferta_id) ?? null }))
    .sort((a, b) => b.pessoas - a.pessoas || (b.ultimo > a.ultimo ? 1 : -1));

  const { data: cfg } = await db.from("config_site").select("dados").eq("id", 1).maybeSingle();
  return { lista, precisa: Math.max(1, Number(cfg?.dados?.avisos_para_expirar) || 2) };
}

async function lerAlertas(db) {
  const { data, error } = await db
    .from("alertas")
    .select("id, termo, preco_max, ativo, criado_em, ultimo_aviso_em")
    .order("criado_em", { ascending: false })
    .limit(5000);
  if (error) return { erro: `Alertas indisponíveis (${error.message}).` };

  const ativos = (data ?? []).filter((a) => a.ativo);
  const termos = new Map();
  for (const a of ativos) {
    const t = String(a.termo ?? "").trim().toLowerCase();
    if (t) termos.set(t, (termos.get(t) ?? 0) + 1);
  }
  return {
    total: (data ?? []).length,
    ativos: ativos.length,
    avisados: ativos.filter((a) => a.ultimo_aviso_em).length,
    maisPedidos: [...termos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([termo, n]) => ({ termo, n })),
    recentes: ativos.slice(0, 30).map(({ id, termo, preco_max, criado_em, ultimo_aviso_em }) => ({ id, termo, preco_max, criado_em, ultimo_aviso_em })),
  };
}

export async function GET(request) {
  if (!(await ehAdmin(request))) return Response.json({ erro: "Somente administradores." }, { status: 403 });
  const db = banco();
  const [avisos, alertas] = await Promise.all([lerAvisos(db), lerAlertas(db)]);
  return Response.json({ avisos, alertas, dias: DIAS });
}
