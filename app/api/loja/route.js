// Entrega mais ofertas da página da loja enquanto a pessoa desce a tela (rolagem infinita).
// Salve como app/api/loja/route.js. Usado pelo components/VitrineLoja.js.
//   /api/loja?slug=mercado-livre&depto=hardware&ordem=menor-preco&pagina=2
import { NextResponse } from "next/server";
import { paginaDaLoja } from "../../../lib/vitrine-loja";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const resultado = await paginaDaLoja({
    slug: p.get("slug") || "",
    depto: p.get("depto") || null,
    ordem: p.get("ordem") || "recentes",
    pagina: Math.min(1000, Math.max(0, Number(p.get("pagina")) || 0)),
  });
  if (!resultado) return NextResponse.json({ erro: "loja_nao_encontrada" }, { status: 404 });
  return NextResponse.json(resultado, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
