import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Usa a chave de serviço (só no servidor, nunca no front-end)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // 1. Confere se quem chamou foi mesmo o Telegram
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await req.json();

  // Grupo manda "message", canal manda "channel_post"
  const msg = update.message ?? update.channel_post;
  if (!msg) return NextResponse.json({ ok: true });

  // 2. Ignora mensagens de bots (evita o bot capturar as próprias postagens)
  if (msg.from?.is_bot) return NextResponse.json({ ok: true });

  const text: string = msg.text ?? msg.caption ?? "";
  if (!text) return NextResponse.json({ ok: true });

  // 3. Extrai o link
  const link = text.match(/https?:\/\/[^\s]+/)?.[0];
  if (!link) return NextResponse.json({ ok: true });

  // 4. Extrai o preço (ex: R$ 1.299,90)
  const priceMatch = text.match(/R\$\s?([\d.]+,\d{2})/);
  const price = priceMatch
    ? parseFloat(priceMatch[1].replace(/\./g, "").replace(",", "."))
    : null;

  // 5. Título = primeira linha do texto sem o link
  const title = text
    .split("\n")[0]
    .replace(/https?:\/\/[^\s]+/g, "")
    .trim();

  // 6. Evita duplicada
  const { data: existing } = await supabase
    .from("offers")
    .select("id")
    .eq("original_link", link)
    .maybeSingle();
  if (existing) return NextResponse.json({ ok: true });

  // 7. Salva como pendente para você aprovar no painel
  await supabase.from("offers").insert({
    title,
    price,
    original_link: link,
    affiliate_link: link, // trocar pelo seu link de afiliado depois
    status: "pending",
  });

  return NextResponse.json({ ok: true });
}