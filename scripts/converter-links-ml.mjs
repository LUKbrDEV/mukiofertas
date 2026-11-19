// Troca o link das ofertas do Mercado Livre pelo link OFICIAL de afiliado (meli.la), o que o ML conta.
// Salve como scripts/converter-links-ml.mjs
//
// Como funciona: o robô continua usando o link do produto (coluna "link") para conferir preço e
// buscar detalhes, sem nunca abrir o meli.la (não gera clique falso). O meli.la fica na coluna
// "affiliate_link", e é para ele que o visitante vai (botão do site /ir/ID, WhatsApp, Telegram).
// Roda sozinho no fim de cada execução do robô do ML (fila-mercadolivre.mjs).
//
// Teste (gera 2 links e mostra, sem gravar):  node --env-file=.env.robo scripts/converter-links-ml.mjs --teste
// Converter tudo que falta:                    node --env-file=.env.robo scripts/converter-links-ml.mjs --todas
//
// ===== PEGAR / RENOVAR A SESSÃO DO MERCADO LIVRE (ML_AFILIADO_COOKIE) =====
// 1. No Chrome, entre no Mercado Livre com a conta de afiliado (perfil MukiOfertas).
// 2. Abra https://www.mercadolivre.com.br/afiliados/linkbuilder e aperte F12 → aba "Rede" (Network).
// 3. Cole o link de qualquer produto no gerador e clique em "Gerar".
// 4. Na lista da aba Rede, clique em "createLink" → "Cabeçalhos" (Headers) → "Cabeçalhos de solicitação".
// 5. Copie TODO o valor da linha "cookie" (é bem comprido).
// 6. Na VPS, no .env.robo (pasta /root/mukiofertas-robo), troque a linha:  ML_AFILIADO_COOKIE="valor copiado"
//    Não saia da conta do ML nesse Chrome (sair derruba a sessão).

import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import { gerarLinksOficiaisML, SessaoMLExpirada, temSessaoML } from "../lib/gerador-ml.mjs";
import { registrarExecucao } from "../lib/prazos.mjs";

const LIMITE_PADRAO = 300; // ofertas por execução (as mais recentes primeiro)
const LIMITE_TODAS = 5000;

export async function converterLinksML(db, { limite = LIMITE_PADRAO, teste = false } = {}) {
  if (!temSessaoML()) {
    const msg = "ML_AFILIADO_COOKIE não configurado: links do ML continuam sem o meli.la oficial";
    console.warn(`[ml-links] ${msg}`);
    if (!teste) await registrarExecucao(db, "converter-links-ml", false, msg);
    return { convertidas: 0, falhas: 0, sessao: false };
  }

  const ofertas = [];
  for (let de = 0; ofertas.length < limite; de += 1000) {
    const { data, error } = await db
      .from("ofertas")
      .select("id, link, titulo")
      .eq("loja", "Mercado Livre")
      .is("affiliate_link", null)
      .like("link", "%mercadoli%")
      .order("publicada_em", { ascending: false })
      .range(de, de + Math.min(999, limite - ofertas.length - 1));
    if (error) throw new Error(`Supabase: ${error.message}`);
    ofertas.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const alvo = teste ? ofertas.slice(0, 2) : ofertas;
  if (!alvo.length) {
    console.log("[ml-links] nenhuma oferta do ML esperando link oficial");
    if (!teste) await registrarExecucao(db, "converter-links-ml", true, "tudo em dia: nenhuma oferta sem meli.la");
    return { convertidas: 0, falhas: 0, sessao: true };
  }
  console.log(`[ml-links] ${alvo.length} oferta(s) do ML para converter`);

  let convertidas = 0;
  let falhas = 0;
  // de 50 em 50, gravando no caminho (se a sessão cair no meio, o que já foi convertido fica salvo)
  for (let i = 0; i < alvo.length; i += 50) {
    const lote = alvo.slice(i, i + 50);
    let mapa;
    try {
      mapa = await gerarLinksOficiaisML(lote.map((o) => o.link));
    } catch (e) {
      const msg = `${e.message} (${convertidas} convertidas antes de parar)`;
      console.error(`[ml-links] ${msg}`);
      if (!teste) await registrarExecucao(db, "converter-links-ml", false, msg);
      return { convertidas, falhas, sessao: !(e instanceof SessaoMLExpirada), erro: e.message };
    }
    for (const o of lote) {
      const r = mapa.get(o.link);
      if (teste) {
        console.log(`  ${r?.link ? "✓" : "✗"} ${o.titulo?.slice(0, 50)}\n    ${o.link}\n    → ${r?.link ?? r?.erro}`);
        continue;
      }
      // Produto que o gerador recusa (fora do programa, página que não aceita link...): marca para não
      // tentar de novo a cada rodada. O botão do site continua indo para o link do produto.
      const valor = r?.link ?? `sem-oficial: ${r?.erro ?? "sem resposta"}`;
      const { error } = await db.from("ofertas").update({ affiliate_link: valor }).eq("id", o.id);
      if (error) console.warn(`  ✗ oferta ${o.id}: ${error.message}`);
      else if (r?.link) convertidas++;
      else falhas++;
    }
  }

  const resumo = `${convertidas} links do ML trocados pelo meli.la oficial` + (falhas ? `, ${falhas} recusados pelo gerador` : "");
  console.log(`[ml-links] ${teste ? "(teste: nada gravado)" : resumo}`);
  if (!teste) await registrarExecucao(db, "converter-links-ml", true, resumo);
  return { convertidas, falhas, sessao: true };
}

// Rodando direto pelo terminal
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const teste = process.argv.includes("--teste");
  const limite = process.argv.includes("--todas") ? LIMITE_TODAS : LIMITE_PADRAO;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  converterLinksML(db, { limite, teste })
    .then((r) => process.exit(r.erro ? 1 : 0))
    .catch((e) => {
      console.error("[ml-links] Erro:", e.message);
      process.exit(1);
    });
}
