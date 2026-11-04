// Recebe a promoção enviada pela comunidade e grava em "sugestoes" (fica pendente para o admin aprovar).
// Salve como app/api/comunidade/enviar/route.js.
// O link de afiliado é gerado de novo aqui no servidor (não confia no que veio do navegador)
// e a sugestão já fica ligada à conta de quem enviou (para o XP do ranking).

import { NextResponse } from "next/server";
import { extrairOferta } from "../../../../lib/extrair-oferta.mjs";
import { bancoServidor, contaDaRequisicao, passouDoLimite } from "../../../../lib/conta-da-requisicao.mjs";
import { categorias } from "../../../../data/ofertas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const dinheiro = (v) => {
  let t = String(v ?? "").replace(/[^\d.,]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

export async function POST(request) {
  const conta = await contaDaRequisicao(request);
  if (!conta) return NextResponse.json({ erro: "Entre na sua conta para enviar ofertas." }, { status: 401 });
  if (passouDoLimite(`enviar:${conta.id}`, 5)) {
    return NextResponse.json({ erro: "Muitos envios seguidos. Espere um minuto." }, { status: 429 });
  }

  const corpo = await request.json().catch(() => ({}));
  const titulo = String(corpo.titulo ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  const precoAtual = dinheiro(corpo.preco_atual);
  let precoAntigo = dinheiro(corpo.preco_antigo);
  if (precoAntigo && precoAtual && precoAntigo <= precoAtual) precoAntigo = null;
  const cupom = String(corpo.cupom ?? "").trim().slice(0, 40) || null;
  const categoria = categorias.some((c) => c.slug === corpo.categoria) ? corpo.categoria : null;

  if (titulo.length < 8) return NextResponse.json({ erro: "Escreva um título com pelo menos 8 letras." }, { status: 400 });
  if (!precoAtual) return NextResponse.json({ erro: "Informe o preço da oferta." }, { status: 400 });

  const dados = await extrairOferta(corpo.link);
  if (dados.erro) return NextResponse.json(dados, { status: 400 });

  const nome = conta.user_metadata?.nome || conta.user_metadata?.full_name || conta.email?.split("@")[0] || "Membro";
  const registro = {
    titulo,
    loja: dados.loja,
    categoria,
    preco_atual: precoAtual,
    preco_antigo: precoAntigo,
    link: dados.link_afiliado,
    cupom,
    imagem: dados.imagem || corpo.imagem || null,
    usuario: nome,
    user_id: conta.id,
    status: "pendente",
  };

  const db = bancoServidor();
  let { error } = await db.from("sugestoes").insert(registro);
  // Banco ainda sem a coluna "imagem" (falta rodar o comunidade-envio.sql): grava sem ela
  if (error && /imagem/i.test(error.message)) {
    const { imagem, ...semImagem } = registro;
    ({ error } = await db.from("sugestoes").insert(semImagem));
  }
  if (error) return NextResponse.json({ erro: `Não foi possível enviar: ${error.message}` }, { status: 500 });

  return NextResponse.json({ ok: true, afiliado: dados.afiliado });
}
