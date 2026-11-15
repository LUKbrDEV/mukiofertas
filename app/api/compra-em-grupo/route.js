// "Divulgar meu grupo": recebe o link do grupo do AliExpress e coloca no mural da compra em grupo.
// Salve como app/api/compra-em-grupo/route.js. Tabelas: supabase/compra-em-grupo.sql.
//
// Corpo: { link_grupo, link_produto?, preco_grupo?, faltam? }
//  - link_grupo:   o link que o AliExpress deu ao criar o grupo (a.aliexpress.com/_xxxx)
//  - link_produto: só se o robô não achar o produto pelo link do grupo
//  - preco_grupo:  preço que aparece no grupo (opcional)
//  - faltam:       1 ou 2 pessoas (padrão 2: quem criou já é a primeira)

import { NextResponse } from "next/server";
import { normalizarLink } from "../../../lib/extrair-oferta.mjs";
import { bancoServidor, contaDaRequisicao, passouDoLimite } from "../../../lib/conta-da-requisicao.mjs";
import { ehLinkAliExpress, garantirProduto, criarGrupo } from "../../../lib/grupo-produtos.mjs";
import { linkDoProduto } from "../../../lib/compra-em-grupo";
import { avisarNovoGrupo } from "../../../lib/compra-em-grupo-avisos.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const erro = (mensagem, status = 400, extra = {}) => NextResponse.json({ erro: mensagem, ...extra }, { status });

export async function POST(request) {
  const conta = await contaDaRequisicao(request);
  if (!conta) return erro("Entre na sua conta para divulgar um grupo.", 401);
  if (passouDoLimite(`grupo:${conta.id}`, 5)) return erro("Muitos grupos seguidos. Espere um minuto.", 429);

  const corpo = await request.json().catch(() => ({}));
  const linkGrupo = normalizarLink(corpo.link_grupo);
  if (!linkGrupo || !ehLinkAliExpress(linkGrupo))
    return erro("Cole o link do grupo que o AliExpress deu (começa com https://a.aliexpress.com/...).");
  const linkProduto = corpo.link_produto ? normalizarLink(corpo.link_produto) : null;
  if (corpo.link_produto && (!linkProduto || !ehLinkAliExpress(linkProduto)))
    return erro("O link do produto precisa ser do AliExpress.");
  const faltam = [1, 2].includes(Number(corpo.faltam)) ? Number(corpo.faltam) : 2;

  const db = bancoServidor();

  // mesmo link já divulgado
  const { data: existente } = await db.from("grupos_compra").select("id, produto_id, status").eq("link", linkGrupo).maybeSingle();
  if (existente) {
    return erro(
      existente.status === "aberto" ? "Esse grupo já está na lista." : "Esse grupo já foi divulgado e fechou.",
      409,
      { produto_id: existente.produto_id }
    );
  }

  // Descobre o produto: pelo link do produto (quando veio) ou pelo link do grupo
  const produto = await garantirProduto(db, {
    link: linkProduto || linkGrupo,
    precoGrupo: corpo.preco_grupo,
    origem: "comunidade",
    novoGrupo: true,
  });
  if (produto.erro) {
    return erro(
      produto.precisaProduto && !linkProduto
        ? "Não conseguimos achar o produto por esse link. Cole também o link da página do produto."
        : produto.erro,
      produto.precisaProduto ? 422 : 400,
      { precisaProduto: Boolean(produto.precisaProduto) }
    );
  }

  const nome = conta.user_metadata?.nome || conta.user_metadata?.full_name || conta.email?.split("@")[0] || "Membro";
  const grupo = await criarGrupo(db, {
    produtoId: produto.produtoId,
    linkGrupo,
    faltam,
    autorId: conta.id,
    autorNome: nome,
  });
  if (grupo.erro) return erro(grupo.erro, grupo.existente ? 409 : 500, { produto_id: produto.produtoId });

  // quem pediu "Avisar sobre novos grupos" recebe um e-mail (sem travar a resposta por muito tempo)
  try {
    await Promise.race([
      avisarNovoGrupo(db, {
        produto: { id: produto.produtoId, titulo: produto.titulo, imagem: produto.imagem },
        faltam,
        autorId: conta.id,
        urlProduto: linkDoProduto({ id: produto.produtoId, titulo: produto.titulo }),
      }),
      new Promise((r) => setTimeout(r, 12000)),
    ]);
  } catch (e) {
    console.error("Aviso de novo grupo falhou:", e.message);
  }

  return NextResponse.json({ ok: true, produto_id: produto.produtoId, titulo: produto.titulo });
}
