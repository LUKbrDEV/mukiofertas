import { NextResponse } from "next/server";
import { salvarOferta } from "../../../lib/salvar-oferta";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ versao: "v3-js" });
}

export async function POST(req) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, motivo: "secret_invalido" }, { status: 401 });
  }

  const update = await req.json();
  console.log("UPDATE:", JSON.stringify(update));

  const msg =
    update.channel_post ??
    update.message ??
    update.edited_channel_post ??
    update.edited_message;
  if (!msg) return NextResponse.json({ ok: true, motivo: "sem_msg" });

  const texto = msg.text ?? msg.caption ?? "";

  // Links escondidos em texto clicável ou em botões
  const entidades = msg.entities ?? msg.caption_entities ?? [];
  const linksOcultos = entidades
    .filter((e) => e.type === "text_link" && e.url)
    .map((e) => e.url);
  const linksBotoes = (msg.reply_markup?.inline_keyboard ?? [])
    .flat()
    .map((b) => b.url)
    .filter(Boolean);

  const completo = [texto, ...linksOcultos, ...linksBotoes].join("\n");
  if (!completo.trim()) return NextResponse.json({ ok: true, motivo: "sem_texto" });

  const resultado = await salvarOferta(completo, "telegram");
  return NextResponse.json(resultado);
}