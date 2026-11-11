// Entrega mais linhas do feed da página inicial enquanto a pessoa desce a tela (rolagem infinita).
// Salve como app/api/feed/route.js. Usado pelo components/FeedLinhas.js.
//   /api/feed?aba=destaques&depto=hardware&pagina=2            (celular: linhas por categoria)
//   /api/feed?modo=grade&aba=destaques&depto=hardware&pagina=2 (computador: grade)
import { NextResponse } from "next/server";
import { paginaDoFeed, paginaDaGrade } from "../../../lib/feed-home";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const buscar = p.get("modo") === "grade" ? paginaDaGrade : paginaDoFeed;
  const resultado = await buscar({
    aba: p.get("aba") || "destaques",
    depto: p.get("depto") || null,
    pagina: Math.min(500, Math.max(0, Number(p.get("pagina")) || 0)),
  });
  return NextResponse.json(resultado, {
    // a Vercel guarda a resposta por 1 minuto (o site fica rápido mesmo com muita gente rolando)
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
