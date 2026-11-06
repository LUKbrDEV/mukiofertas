// mukiofertas.com.br/telegram → canal do Telegram
// Salve como app/telegram/route.js (o link fica em data/links-curtos.js)

import { NextResponse } from "next/server";
import { LINK_TELEGRAM } from "../../data/links-curtos";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.redirect(LINK_TELEGRAM, 307);
}
