// Botões "Rodar agora" do painel admin.
// Salve como app/api/admin/rodar/route.js
//
//   GET  → últimos pedidos + se a VPS está ouvindo
//   POST { tarefa: "coleta" } → cria um pedido; a VPS (scripts/executar-pedidos.mjs) roda em até 1 minuto
//
// Só administradores. O painel manda só o id da tarefa; os comandos ficam na VPS.
// Precisa da tabela do supabase/robo-pedidos.sql.

import { createClient } from "@supabase/supabase-js";
import { IDS_TAREFAS } from "../../../../lib/robo-tarefas.mjs";

export const dynamic = "force-dynamic";

// Confere se quem chamou é administrador e devolve o e-mail
async function admin(request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await db.rpc("eh_admin");
  if (error || data !== true) return null;
  const { data: u } = await db.auth.getUser(token);
  return { email: u?.user?.email ?? "admin" };
}

const banco = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const AVISO_SQL = "Rode o arquivo supabase/robo-pedidos.sql no Supabase (SQL Editor) para ativar os botões.";

export async function GET(request) {
  if (!(await admin(request))) return Response.json({ erro: "Somente administradores." }, { status: 403 });
  const db = banco();
  const [pedidos, sinal] = await Promise.all([
    db.from("robo_pedidos").select("*").order("criado_em", { ascending: false }).limit(15),
    db.from("robo_status").select("ultima_execucao, resumo").eq("script", "executar-pedidos").maybeSingle(),
  ]);
  if (pedidos.error) return Response.json({ erro: AVISO_SQL, detalhe: pedidos.error.message }, { status: 500 });
  return Response.json({ pedidos: pedidos.data, ouvindo: sinal.data ?? null });
}

export async function POST(request) {
  const quem = await admin(request);
  if (!quem) return Response.json({ erro: "Somente administradores." }, { status: 403 });
  const { tarefa } = await request.json().catch(() => ({}));
  if (!IDS_TAREFAS.includes(tarefa)) return Response.json({ erro: "Tarefa desconhecida." }, { status: 400 });

  const db = banco();
  // mesma tarefa já pedida e ainda não terminou: não duplica
  const { data: aberto, error: erroLer } = await db
    .from("robo_pedidos")
    .select("id, status")
    .eq("tarefa", tarefa)
    .in("status", ["pendente", "rodando"])
    .limit(1)
    .maybeSingle();
  if (erroLer) return Response.json({ erro: AVISO_SQL, detalhe: erroLer.message }, { status: 500 });
  if (aberto) return Response.json({ ok: true, jaPedido: true, pedido: aberto });

  const { data, error } = await db.from("robo_pedidos").insert({ tarefa, pedido_por: quem.email }).select("*").single();
  if (error) return Response.json({ erro: AVISO_SQL, detalhe: error.message }, { status: 500 });
  return Response.json({ ok: true, pedido: data });
}
