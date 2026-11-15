// "Avisar sobre novos grupos": guarda o pedido da pessoa (precisa estar logada).
// Salve como app/api/compra-em-grupo/avisar/route.js.
// O e-mail sai quando alguém divulga um grupo do produto (app/api/compra-em-grupo/route.js).
//
// POST { produto_id }            → liga o aviso
// POST { produto_id, desligar }  → desliga
// GET  ?produto=ID (com login)   → { ligado: true/false }

import { NextResponse } from "next/server";
import { bancoServidor, contaDaRequisicao, passouDoLimite } from "../../../../lib/conta-da-requisicao.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const valido = (id) => /^\d{6,}$/.test(String(id ?? ""));

export async function GET(request) {
  const conta = await contaDaRequisicao(request);
  const id = new URL(request.url).searchParams.get("produto");
  if (!conta || !valido(id)) return NextResponse.json({ ligado: false });
  const { data } = await bancoServidor()
    .from("grupos_avisos")
    .select("id")
    .eq("produto_id", String(id))
    .eq("user_id", conta.id)
    .maybeSingle();
  return NextResponse.json({ ligado: Boolean(data) });
}

export async function POST(request) {
  const conta = await contaDaRequisicao(request);
  if (!conta) return NextResponse.json({ erro: "Entre na sua conta para receber o aviso." }, { status: 401 });
  if (passouDoLimite(`grupo-avisar:${conta.id}`, 20)) {
    return NextResponse.json({ erro: "Muitos cliques seguidos. Espere um minuto." }, { status: 429 });
  }
  const { produto_id: id, desligar } = await request.json().catch(() => ({}));
  if (!valido(id)) return NextResponse.json({ erro: "Produto inválido." }, { status: 400 });

  const db = bancoServidor();
  if (desligar) {
    await db.from("grupos_avisos").delete().eq("produto_id", String(id)).eq("user_id", conta.id);
    return NextResponse.json({ ligado: false });
  }
  const { error } = await db
    .from("grupos_avisos")
    .upsert({ produto_id: String(id), user_id: conta.id, email: conta.email ?? null }, { onConflict: "produto_id,user_id" });
  if (error) {
    console.error("Erro ao salvar aviso de grupo:", error.message);
    return NextResponse.json(
      { erro: /grupos_avisos/.test(error.message) ? "Aviso ainda não ativado no banco." : "Não foi possível salvar agora." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ligado: true });
}
