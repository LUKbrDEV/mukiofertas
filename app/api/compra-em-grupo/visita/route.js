// Conta uma visualização da página de um produto da compra em grupo.
// Salve como app/api/compra-em-grupo/visita/route.js. O navegador chama 1 vez por visita.

import { NextResponse } from "next/server";
import { bancoServidor, passouDoLimite } from "../../../../lib/conta-da-requisicao.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "sem-ip";
  const { id } = await request.json().catch(() => ({}));
  if (!/^\d{6,}$/.test(String(id ?? ""))) return NextResponse.json({ ok: false }, { status: 400 });
  // a mesma pessoa abrindo várias vezes seguidas conta uma vez só
  if (passouDoLimite(`visita:${ip}:${id}`, 1, 30 * 60_000)) return NextResponse.json({ ok: true });

  const db = bancoServidor();
  const { data } = await db.from("grupos_produtos").select("visualizacoes").eq("id", String(id)).maybeSingle();
  if (!data) return NextResponse.json({ ok: false }, { status: 404 });
  await db
    .from("grupos_produtos")
    .update({ visualizacoes: (data.visualizacoes ?? 0) + 1 })
    .eq("id", String(id));
  return NextResponse.json({ ok: true });
}
