// Recebe as ofertas lidas pelo leitor de grupos do Telegram (scripts/leitor-telegram.mjs, na VPS),
// troca o link pelo SEU link de afiliado e publica pelo mesmo caminho do webhook do canal.
// Salve como app/api/grupos/importar/route.js
//
// Segurança: só aceita chamadas com o cabeçalho x-leitor-secret igual ao TELEGRAM_WEBHOOK_SECRET.
// Regra principal: oferta que não dá para converter para o seu link de afiliado NÃO entra
// (assim o site nunca publica o link de afiliado de outra pessoa).
import { NextResponse } from "next/server";
import { salvarOferta } from "../../../../lib/salvar-oferta";
import { extrairOferta, lojaDoLink } from "../../../../lib/extrair-oferta.mjs";
import { prepararLinkRakuten } from "../../../../lib/afiliado-rakuten.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Lojas convertidas pelo lib/extrair-oferta.mjs (APIs de afiliado / tag / matt_word)
const CONVERTE_COM_EXTRAIR = new Set(["Amazon", "Mercado Livre", "Shopee", "AliExpress", "KaBuM!"]);

const LINK = /https?:\/\/[^\s<>"'()\[\]]+/gi;
const limparFim = (l) => l.replace(/[.,;:!?*_~]+$/, "");

// Link encurtado desconhecido (bit.ly etc.): descobre para onde ele leva
async function destinoFinal(link) {
  try {
    const r = await fetch(link, { redirect: "follow", signal: AbortSignal.timeout(10000) });
    return r.url || link;
  } catch {
    return link;
  }
}

async function converter(link) {
  let alvo = link;
  let loja = lojaDoLink(alvo);

  // Netshoes (Rakuten): também resolve links curtos e links de afiliado de outras pessoas
  if (!loja) {
    const rk = await prepararLinkRakuten(alvo, "Outras").catch(() => null);
    if (rk) return { link: rk.link, loja: rk.loja };
    alvo = await destinoFinal(alvo);
    loja = lojaDoLink(alvo);
  }
  if (loja === "Magalu") return { link: alvo, loja }; // o salvar-oferta troca pela sua loja do Influenciador
  if (CONVERTE_COM_EXTRAIR.has(loja)) {
    const r = await extrairOferta(alvo);
    if (r?.afiliado && r.link_afiliado) return { link: r.link_afiliado, loja, imagem: r.imagem || null };
    return { recusa: "sem_link_afiliado", loja };
  }
  return { recusa: "loja_sem_afiliado", loja: loja ?? new URL(alvo).hostname };
}

export async function POST(req) {
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || req.headers.get("x-leitor-secret") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, motivo: "secret_invalido" }, { status: 401 });
  }
  const { texto = "", imagem = null, grupo = "" } = await req.json().catch(() => ({}));
  const links = [...new Set((String(texto).match(LINK) ?? []).map(limparFim))].filter((l) => !/^https?:\/\/(t\.me|telegram\.me|chat\.whatsapp\.com)\//i.test(l));
  if (!links.length) return NextResponse.json({ ok: true, motivo: "sem_link" });

  const principal = links[0];
  const c = await converter(principal);
  if (c.recusa) {
    console.log(`[grupos] ${grupo}: recusada (${c.recusa}, ${c.loja})`);
    return NextResponse.json({ ok: true, motivo: c.recusa, detalhe: c.loja });
  }

  // Tira TODOS os links da mensagem (de outras pessoas, convites de grupo...) e deixa só o seu
  let final = String(texto).replace(LINK, " ").replace(/[ \t]+\n/g, "\n");
  final = `${final.trim()}\n${c.link}`;

  const resultado = await salvarOferta(final, "telegram", { imagem: imagem || c.imagem || null });
  console.log(`[grupos] ${grupo}: ${c.loja} → ${resultado?.motivo ?? (resultado?.ok ? "publicada" : "erro")}`);
  return NextResponse.json({ ...resultado, loja: c.loja });
}
