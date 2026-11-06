// mukiofertas.com.br/whatsapp → mesmo destino do /grupo
// Salve como app/whatsapp/route.js (o link fica em data/links-curtos.js)

import { NextResponse } from "next/server";
import { LINK_GRUPO_WHATSAPP } from "../../data/links-curtos";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.redirect(LINK_GRUPO_WHATSAPP, 307);
}
