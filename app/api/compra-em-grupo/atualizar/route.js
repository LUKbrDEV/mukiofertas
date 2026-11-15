// Botões do grupo: "Entrei no grupo" (diminui as vagas) e "Esse grupo já fechou".
// Salve como app/api/compra-em-grupo/atualizar/route.js.
// Não precisa de conta (quem entra no grupo nem sempre tem cadastro), por isso:
//  - limite de cliques por endereço de internet
//  - "já fechou" só tira o grupo do mural depois de 2 avisos

import { NextResponse } from "next/server";
import { bancoServidor, passouDoLimite } from "../../../../lib/conta-da-requisicao.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AVISOS_PARA_FECHAR = 2;

export async function POST(request) {
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "sem-ip";
  if (passouDoLimite(`grupo-atualizar:${ip}`, 10)) {
    return NextResponse.json({ erro: "Muitos cliques seguidos. Espere um minuto." }, { status: 429 });
  }

  const { id, acao } = await request.json().catch(() => ({}));
  if (!Number.isInteger(Number(id)) || !["entrei", "fechou"].includes(acao)) {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const db = bancoServidor();
  const { data: g } = await db
    .from("grupos_compra")
    .select("id, faltam, status, avisos_fechado, expira_em")
    .eq("id", Number(id))
    .maybeSingle();
  if (!g || g.status !== "aberto" || new Date(g.expira_em) <= new Date()) {
    return NextResponse.json({ ok: true, faltam: 0, status: "fechado" });
  }

  let mudanca;
  if (acao === "entrei") {
    const faltam = Math.max(0, g.faltam - 1);
    mudanca = { faltam, status: faltam === 0 ? "fechado" : "aberto" };
  } else {
    const avisos = (g.avisos_fechado ?? 0) + 1;
    mudanca = { avisos_fechado: avisos, status: avisos >= AVISOS_PARA_FECHAR ? "fechado" : "aberto" };
  }

  // só grava se ninguém mudou o grupo no meio do caminho (dois cliques ao mesmo tempo)
  const { data: gravado, error } = await db
    .from("grupos_compra")
    .update(mudanca)
    .eq("id", g.id)
    .eq("faltam", g.faltam)
    .eq("avisos_fechado", g.avisos_fechado ?? 0)
    .select("faltam, status")
    .maybeSingle();
  if (error) return NextResponse.json({ erro: "Não foi possível atualizar agora." }, { status: 500 });
  if (!gravado) return NextResponse.json({ erro: "O grupo acabou de mudar. Atualize a página." }, { status: 409 });
  return NextResponse.json({ ok: true, ...gravado });
}
