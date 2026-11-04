// Lê o link colado no "Enviar promoção" e devolve título, foto, preços e o link de afiliado.
// Salve como app/api/comunidade/extrair/route.js.

import { NextResponse } from "next/server";
import { extrairOferta } from "../../../../lib/extrair-oferta.mjs";
import { contaDaRequisicao, passouDoLimite } from "../../../../lib/conta-da-requisicao.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request) {
  const conta = await contaDaRequisicao(request);
  if (!conta) return NextResponse.json({ erro: "Entre na sua conta para enviar ofertas." }, { status: 401 });
  if (passouDoLimite(`extrair:${conta.id}`, 15)) {
    return NextResponse.json({ erro: "Muitos links seguidos. Espere um minuto e tente de novo." }, { status: 429 });
  }

  const { link } = await request.json().catch(() => ({}));
  const resultado = await extrairOferta(link);
  if (resultado.erro) return NextResponse.json(resultado, { status: 400 });
  return NextResponse.json(resultado);
}
