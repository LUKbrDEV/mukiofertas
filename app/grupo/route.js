// mukiofertas.com.br/grupo → grupo de ofertas do WhatsApp
// Salve como app/grupo/route.js (o link fica em data/links-curtos.js)

import { NextResponse } from "next/server";
import { LINK_GRUPO_WHATSAPP } from "../../data/links-curtos";

export const dynamic = "force-dynamic";

export function GET() {
  // 307 = redirecionamento temporário: se o grupo mudar, ninguém fica preso no link antigo
  return NextResponse.redirect(LINK_GRUPO_WHATSAPP, 307);
}
