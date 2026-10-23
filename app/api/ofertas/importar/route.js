import { NextResponse } from "next/server";
import { salvarOferta } from "../../../../lib/salvar-oferta";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, motivo: "secret_invalido" }, { status: 401 });
  }
  const { texto } = await req.json();
  const resultado = await salvarOferta(texto, "importar");
  return NextResponse.json(resultado);
}