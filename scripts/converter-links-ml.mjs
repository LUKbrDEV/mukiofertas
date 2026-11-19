// Mercado Livre no site SÓ com link oficial de afiliado (meli.la), o único que o ML conta com certeza.
// Salve como scripts/converter-links-ml.mjs
//
// Como funciona:
//  - Oferta do ML sem meli.la fica ESCONDIDA (a trava supabase/ml-so-meli.sql faz isso sozinha no banco,
//    venha a oferta de onde vier: robô do ML, Telegram, comunidade, painel).
//  - Este script gera o meli.la no gerador oficial de afiliados e só então LIBERA a oferta no site.
//    O meli.la fica na coluna "affiliate_link"; o robô continua usando o link do produto (coluna "link")
//    para conferir preço e buscar detalhes, sem nunca abrir o meli.la (não gera clique falso).
//  - O que o gerador recusa (anúncio pausado/encerrado, link quebrado) sai do site.
//  - Exceção: páginas de CUPOM do ML (mercadolivre.com.br/cupons e links de campanha /sec/) continuam no
//    site com o link normal (o gerador não converte cupom em meli.la). Não são tocadas por este script.
//  - No fim, faz uma varredura: qualquer oferta do ML ainda no ar sem meli.la é escondida.
// Roda sozinho no fim de cada execução do robô do ML (fila-mercadolivre.mjs).
//
// Teste (gera 2 links e mostra, sem gravar):  node --env-file=.env.robo scripts/converter-links-ml.mjs --teste
// Converter tudo que falta + varredura:        node --env-file=.env.robo scripts/converter-links-ml.mjs --todas
//
// ===== PEGAR / RENOVAR A SESSÃO DO MERCADO LIVRE (ML_AFILIADO_COOKIE) =====
// 1. No Chrome, entre no Mercado Livre com a conta de afiliado (perfil MukiOfertas).
// 2. Abra https://www.mercadolivre.com.br/afiliados/linkbuilder e aperte F12 → aba "Rede" (Network).
// 3. Cole o link de qualquer produto no gerador e clique em "Gerar".
// 4. Na lista da aba Rede, clique em "createLink" → "Cabeçalhos" (Headers) → "Cabeçalhos de solicitação".
// 5. Copie TODO o valor da linha "cookie" (é bem comprido).
// 6. Na VPS, no .env.robo (pasta /root/mukiofertas-robo), troque a linha:  ML_AFILIADO_COOKIE="valor copiado"
//    Não saia da conta do ML nesse Chrome (sair derruba a sessão).
// Enquanto a sessão estiver vencida, as ofertas novas do ML ficam escondidas esperando ("aguardando")
// e voltam sozinhas para o site assim que a sessão for renovada.

import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import { gerarLinksOficiaisML, SessaoMLExpirada, temSessaoML } from "../lib/gerador-ml.mjs";
import { registrarExecucao } from "../lib/prazos.mjs";

const LIMITE_PADRAO = 300; // ofertas por execução (as mais recentes primeiro)
const LIMITE_TODAS = 5000;
const LOJA_ML = "mercado%livre"; // "Mercado Livre", "mercado livre"...
export const AGUARDANDO = "aguardando"; // escondida esperando o meli.la
// Páginas de cupom do ML ficam de fora (padrões do filtro "like" do Supabase)
const CUPONS = ["%mercadolivre.com.br/cupons%", "%mercadolivre.com.br/sec/%"];
const semCupons = (consulta) => CUPONS.reduce((q, padrao) => q.not("link", "ilike", padrao), consulta);

// Esconde do site toda oferta do ML que ainda está no ar sem meli.la. Devolve quantas escondeu.
export async function esconderMLSemMeli(db) {
  let escondidas = 0;
  // 1) sem tentativa ainda (affiliate_link vazio): esconde e marca para voltar quando ganhar o meli.la
  {
    const { data, error } = await semCupons(
      db
        .from("ofertas")
        .update({ ativa: false, affiliate_link: AGUARDANDO })
        .ilike("loja", LOJA_ML)
        .eq("ativa", true)
        .not("link", "like", "%meli.la/%")
        .is("affiliate_link", null)
    ).select("id");
    if (error) throw new Error(`Supabase (esconder pendentes): ${error.message}`);
    escondidas += data?.length ?? 0;
  }
  // 2) recusadas pelo gerador ou com qualquer outro valor que não seja meli.la: só esconde
  {
    const { data, error } = await semCupons(
      db
        .from("ofertas")
        .update({ ativa: false })
        .ilike("loja", LOJA_ML)
        .eq("ativa", true)
        .not("link", "like", "%meli.la/%")
        .not("affiliate_link", "is", null)
        .not("affiliate_link", "like", "https://meli.la/%")
    ).select("id");
    if (error) throw new Error(`Supabase (esconder sem meli.la): ${error.message}`);
    escondidas += data?.length ?? 0;
  }
  return escondidas;
}

export async function converterLinksML(db, { limite = LIMITE_PADRAO, teste = false } = {}) {
  let resultado = { convertidas: 0, liberadas: 0, falhas: 0, sessao: temSessaoML() };
  let erroGeral = null;

  try {
    if (!temSessaoML()) {
      erroGeral = "ML_AFILIADO_COOKIE não configurado: ofertas do ML sem meli.la ficam escondidas";
    } else {
      // Ofertas do ML que ainda não têm meli.la: nunca tentadas (vazio) ou escondidas esperando ("aguardando")
      const ofertas = [];
      for (let de = 0; ofertas.length < limite; de += 1000) {
        const { data, error } = await semCupons(
          db
            .from("ofertas")
            .select("id, link, titulo, affiliate_link")
            .ilike("loja", LOJA_ML)
            .or(`affiliate_link.is.null,affiliate_link.eq.${AGUARDANDO}`)
            .like("link", "%mercadoli%")
        )
          .order("publicada_em", { ascending: false })
          .range(de, de + Math.min(999, limite - ofertas.length - 1));
        if (error) throw new Error(`Supabase: ${error.message}`);
        ofertas.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      const alvo = teste ? ofertas.slice(0, 2) : ofertas;
      console.log(`[ml-links] ${alvo.length} oferta(s) do ML para converter`);

      // de 50 em 50, gravando no caminho (se a sessão cair no meio, o que já foi convertido fica salvo)
      for (let i = 0; i < alvo.length; i += 50) {
        const lote = alvo.slice(i, i + 50);
        let mapa;
        try {
          mapa = await gerarLinksOficiaisML(lote.map((o) => o.link));
        } catch (e) {
          erroGeral = `${e.message} (${resultado.convertidas} convertidas antes de parar)`;
          resultado.sessao = !(e instanceof SessaoMLExpirada);
          break;
        }
        for (const o of lote) {
          const r = mapa.get(o.link);
          if (teste) {
            console.log(`  ${r?.link ? "✓" : "✗"} ${o.titulo?.slice(0, 50)}\n    ${o.link}\n    → ${r?.link ?? r?.erro}`);
            continue;
          }
          let campos;
          if (r?.link) {
            campos = { affiliate_link: r.link };
            // estava escondida só esperando o meli.la: volta para o site
            if (o.affiliate_link === AGUARDANDO) campos.ativa = true;
          } else {
            // Produto que o gerador recusa (pausado, encerrado, página de cupons...): sai do site e
            // fica marcado para não tentar de novo a cada rodada.
            campos = { affiliate_link: `sem-oficial: ${r?.erro ?? "sem resposta"}`, ativa: false };
          }
          const { error } = await db.from("ofertas").update(campos).eq("id", o.id);
          if (error) console.warn(`  ✗ oferta ${o.id}: ${error.message}`);
          else if (r?.link) {
            resultado.convertidas++;
            if (campos.ativa) resultado.liberadas++;
          } else resultado.falhas++;
        }
      }
    }
  } catch (e) {
    erroGeral = e.message;
  }

  // Varredura final: nenhuma oferta do ML fica no ar sem meli.la (roda até com a sessão vencida)
  let escondidas = 0;
  if (!teste) {
    try {
      escondidas = await esconderMLSemMeli(db);
    } catch (e) {
      erroGeral = erroGeral ? `${erroGeral} · ${e.message}` : e.message;
    }
  }

  const resumo =
    `${resultado.convertidas} com meli.la oficial` +
    (resultado.liberadas ? ` (${resultado.liberadas} voltaram ao site)` : "") +
    (resultado.falhas ? `, ${resultado.falhas} recusadas pelo gerador (fora do site)` : "") +
    (escondidas ? `, ${escondidas} escondidas por não ter meli.la` : "");
  if (teste) console.log("[ml-links] (teste: nada gravado)");
  else if (erroGeral) {
    console.error(`[ml-links] ${erroGeral} · ${resumo}`);
    await registrarExecucao(db, "converter-links-ml", false, `${erroGeral} · ${resumo}`);
  } else {
    console.log(`[ml-links] ${resumo}`);
    await registrarExecucao(db, "converter-links-ml", true, resumo);
  }
  return { ...resultado, escondidas, erro: erroGeral };
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
