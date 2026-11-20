// Recebe as ofertas lidas pelo leitor de grupos do Telegram (scripts/leitor-telegram.mjs, na VPS),
// troca o link pelo SEU link de afiliado e publica pelo mesmo caminho do webhook do canal.
// Salve como app/api/grupos/importar/route.js
//
// Segurança: só aceita chamadas com o cabeçalho x-leitor-secret igual ao TELEGRAM_WEBHOOK_SECRET.
// Regra principal: oferta que não dá para converter para o seu link de afiliado NÃO entra
// (assim o site nunca publica o link de afiliado de outra pessoa).
import { NextResponse } from "next/server";
import { salvarOferta } from "../../../../lib/salvar-oferta";
import { extrairOferta, lojaDoLink, linkAfiliadoML } from "../../../../lib/extrair-oferta.mjs";
import { parseOferta } from "../../../../lib/parse-oferta";
import { separarCupons, lojaDosCupons, textoDoCupom } from "../../../../lib/cupons-multiplos.mjs";
import { prepararLinkRakuten } from "../../../../lib/afiliado-rakuten.mjs";
import { converterLinkTerabyte } from "../../../../lib/afiliado-terabyte.mjs";
import { createClient } from "@supabase/supabase-js";
import { registrarExecucao } from "../../../../lib/prazos.mjs";

// Aba Saúde do robô: guarda a última oferta que chegou do leitor (script "leitor-grupos")
async function anotar(ok, resumo) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  await registrarExecucao(db, "leitor-grupos", ok, resumo);
}

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

// Postagem que é só um cupom ("Cupom Mercado Livre", "R$ 20 OFF acima de R$ 99", "Código: MELI20")
const ehPostagemDeCupom = (texto) =>
  parseOferta(texto)?.categoria === "cupons" || /\bcup(o|õ)(m|ns|es)\b|\bc[oó]digo\s*:/i.test(String(texto ?? ""));

// Cupom do Mercado Livre: o link não é de um produto (página de cupons, campanha, ou a página
// "social" de outro afiliado). Usa a própria página com o SEU matt_word; se for a página de outro
// afiliado (/social/...), manda para a central de cupons do Mercado Livre, também com o seu matt_word.
async function linkDeCupomML(link) {
  const destino = await destinoFinal(link);
  try {
    const u = new URL(destino);
    const doML = /(^|\.)mercadoli(vre|bre)\.com(\.br)?$/i.test(u.hostname);
    if (doML && !/^\/social(\/|$)/i.test(u.pathname) && u.pathname !== "/") return linkAfiliadoML(destino);
  } catch {}
  return linkAfiliadoML("https://www.mercadolivre.com.br/cupons");
}

async function converter(link, texto = "") {
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
  if (loja === "Terabyte") return { link: converterLinkTerabyte(alvo), loja }; // seu link de parceiro (?p=)
  if (CONVERTE_COM_EXTRAIR.has(loja)) {
    const r = await extrairOferta(alvo);
    if (r?.afiliado && r.link_afiliado) return { link: r.link_afiliado, loja, imagem: r.imagem || null };
    // Cupom do Mercado Livre não tem anúncio no link (antes era recusado como "sem_link_afiliado")
    if (loja === "Mercado Livre" && ehPostagemDeCupom(texto)) return { link: await linkDeCupomML(alvo), loja };
    return { recusa: "sem_link_afiliado", loja };
  }
  return { recusa: "loja_sem_afiliado", loja: loja ?? new URL(alvo).hostname };
}

// Nome dos canais (ou parte do nome) separados por vírgula: "nerd,outro canal"
const CANAIS_FOTO_COM_MARCA = new RegExp(
  (process.env.TELEGRAM_FOTO_COM_MARCA || "nerd")
    .split(",")
    .map((n) => n.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter(Boolean)
    .join("|") || "(?!)",
  "i"
);

export async function POST(req) {
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || req.headers.get("x-leitor-secret") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, motivo: "secret_invalido" }, { status: 401 });
  }
  const { texto = "", imagem = null, grupo = "", lojas = ["todas"] } = await req.json().catch(() => ({}));
  const todasAsLojas = !Array.isArray(lojas) || lojas.some((l) => /^todas$/i.test(String(l)));
  const lojaAceita = (loja) => todasAsLojas || lojas.some((l) => String(l).toLowerCase() === String(loja ?? "").toLowerCase());
  const links = [...new Set((String(texto).match(LINK) ?? []).map(limparFim))].filter((l) => !/^https?:\/\/(t\.me|telegram\.me|chat\.whatsapp\.com)\//i.test(l));
  if (!links.length) return NextResponse.json({ ok: true, motivo: "sem_link" });

  // Postagem com VÁRIOS cupons (cada um com código e link): cada cupom vira uma postagem separada,
  // com o link trocado pelo seu (antes virava uma oferta só, "sem categoria")
  const variosCupons = separarCupons(texto);
  if (variosCupons) {
    const lojaDoTexto = lojaDosCupons(texto);
    const convertidos = await Promise.all(
      variosCupons.map(async (cp) => {
        const lojaCupom = lojaDoLink(cp.link);
        if (lojaCupom && !lojaAceita(lojaCupom)) return { cp, recusa: "loja_fora_do_filtro" };
        // cupom do Mercado Livre: vai direto para o link de cupom (não tem anúncio para procurar)
        if (lojaCupom === "Mercado Livre") return { cp, link: await linkDeCupomML(cp.link), loja: lojaCupom };
        const c = await converter(cp.link, textoDoCupom(cp, { loja: lojaDoTexto }));
        return { cp, ...c };
      })
    );
    const contagem = {};
    for (const item of convertidos) {
      const r = item.recusa
        ? { motivo: item.recusa }
        : await salvarOferta(textoDoCupom(item.cp, { loja: lojaDoTexto || item.loja, link: item.link }), "telegram", {
            jaNoCanal: false,
          });
      const m = r?.motivo ?? (r?.ok ? "salva" : "erro");
      contagem[m] = (contagem[m] ?? 0) + 1;
    }
    const detalhe = `${variosCupons.length} cupons: ${Object.entries(contagem).map(([m, n]) => `${n} ${m}`).join(", ")}`;
    console.log(`[grupos] ${grupo}: ${detalhe}`);
    await anotar(true, `${lojaDoTexto || "cupons"} → ${detalhe}`);
    return NextResponse.json({ ok: true, motivo: "cupons_separados", detalhe, loja: lojaDoTexto || null });
  }

  const principal = links[0];
  // Só Netshoes (teste): link que claramente é de outra loja nem é convertido
  const lojaRapida = lojaDoLink(principal);
  if (lojaRapida && !lojaAceita(lojaRapida)) return NextResponse.json({ ok: true, motivo: "loja_fora_do_filtro", detalhe: lojaRapida });
  const c = await converter(principal, texto);
  if (!c.recusa && !lojaAceita(c.loja)) return NextResponse.json({ ok: true, motivo: "loja_fora_do_filtro", detalhe: c.loja });
  if (c.recusa) {
    console.log(`[grupos] ${grupo}: recusada (${c.recusa}, ${c.loja})`);
    return NextResponse.json({ ok: true, motivo: c.recusa, detalhe: c.loja });
  }

  // Tira TODOS os links da mensagem (de outras pessoas, convites de grupo...) e deixa só o seu
  let final = String(texto).replace(LINK, " ").replace(/[ \t]+\n/g, "\n");
  final = `${final.trim()}\n${c.link}`;

  // Netshoes não manda o preço "de" e bloqueia a leitura da página: entra só com o preço atual
  const SEM_PRECO_ANTIGO = new Set(["Netshoes"]);
  // Foto: 1) a OFICIAL da loja (API do Mercado Livre, Shopee, AliExpress...); 2) a da página do produto;
  // 3) só em último caso, a foto da postagem do grupo (às vezes tirada no celular ou com marca d'água).
  // Canais que põem a marca d'água deles na foto (TELEGRAM_FOTO_COM_MARCA, padrão "nerd" = Nerd Ofertas):
  // a foto da postagem NUNCA é usada.
  const fotoDoGrupo = imagem && !CANAIS_FOTO_COM_MARCA.test(String(grupo)) ? imagem : null;
  const resultado = await salvarOferta(final, "telegram", {
    imagem: c.imagem || null,
    fotoReserva: fotoDoGrupo,
    aceitarSemDesconto: SEM_PRECO_ANTIGO.has(c.loja),
    jaNoCanal: false, // oferta de outro canal: entra na fila para postar no SEU canal do Telegram
  });
  const situacao = resultado?.motivo ?? (resultado?.ok ? "publicada" : "erro");
  console.log(`[grupos] ${grupo}: ${c.loja} → ${situacao}`);
  await anotar(resultado?.ok !== false, `${c.loja} → ${situacao}`);
  return NextResponse.json({ ...resultado, loja: c.loja });
}
