import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const secret = req.headers.get(
    "x-telegram-bot-api-secret-token"
  );

  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json(
      { ok: false },
      { status: 401 }
    );
  }

  const update = await req.json();

  console.log(
    "UPDATE:",
    JSON.stringify(update, null, 2)
  );

  const msg = update.message ?? update.channel_post;

  if (!msg) {
    return NextResponse.json({ ok: true });
  }

  const text: string =
    msg.text ?? msg.caption ?? "";

  if (!text) {
    return NextResponse.json({ ok: true });
  }

  const link =
    text.match(/https?:\/\/[^\s]+/)?.[0];

  if (!link) {
    return NextResponse.json({ ok: true });
  }

  const priceMatch = text.match(
    /R\$\s?([\d.]+,\d{2})/
  );

  const price = priceMatch
    ? parseFloat(
        priceMatch[1]
          .replace(/\./g, "")
          .replace(",", ".")
      )
    : null;

  const title = text
    .split("\n")[0]
    .replace(/https?:\/\/[^\s]+/g, "")
    .trim();

  const { data: existing } = await supabase
    .from("offers")
    .select("id")
    .eq("original_link", link)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("offers")
    .insert({
      title,
      price,
      original_link: link,
      affiliate_link: link,
      status: "pending",
    });

  if (error) {
    console.error(
      "Erro ao salvar oferta:",
      error
    );

    return NextResponse.json(
      { ok: false },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}