import { createClient } from "@supabase/supabase-js";
import { buscar as buscarLomadee } from "./fontes/lomadee.mjs";
import { buscar as buscarShopee } from "./fontes/shopee.mjs";
import { buscar as buscarAliExpress } from "./fontes/aliexpress.mjs";
import { buscar as buscarAwin } from "./fontes/awin.mjs";
import { buscar as buscarRakuten } from "./fontes/rakuten.mjs";
import { buscar as buscarCupons } from "./fontes/cupons.mjs";
import { classificar } from "../lib/classificar.mjs";
import { regrasDeQualidade, motivoDeRecusa, ehMarketplace, maximoNoAr, lojaBloqueada } from "../lib/qualidade.mjs";
import { chaveDaOferta } from "../lib/duplicadas.mjs";
import { limparExpiradas } from "../lib/limpeza.mjs";
import {
  DIAS_NO_SITE,
  DIAS_EXPIRADA_VISIVEL,
  DIAS_BLOQUEIO_REPUBLICAR,
  HORAS_ENTRE_CONFERENCIAS,
  TOLERANCIA_PERCENTUAL,
  precoSubiu,
  horaDeConferir,
  descontoMinimoDa,
  podeRenovar,
  camposDaRenovacao,
  momentoExpiracao,
  podeVoltar,
  aplicarConfigDoBanco,
  registrarExecucao,
} from "../lib/prazos.mjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Desconto mínimo para publicar, tolerância de preço, renovação e pausa da coleta
// vêm do painel admin (aba Configurações). Relâmpago e Destaque são marcados pelo
// próprio banco, com as regras da mesma aba.
const DIA_MS = 24 * 60 * 60 * 1000;

// Lista das fontes ativas. Novas fontes entram aqui.
const TODAS_AS_FONTES = {
  lomadee: buscarLomadee,
  shopee: buscarShopee,
  aliexpress: buscarAliExpress,
  awin: buscarAwin,
  rakuten: buscarRakuten, // Netshoes (Rakuten Advertising)
  cupons: buscarCupons, // cupons da Lomadee e da Awin (aba Cupons)
};

// Opções da linha de comando (usadas pelos botões do painel admin):
//   --so=awin   roda só essa fonte (ex.: botão "Buscar ofertas da KaBuM!")
//   --forcar    ignora o horário de download da Awin (que normalmente é de X em X horas)
const SO = process.argv.find((a) => a.startsWith("--so="))?.slice(5);
const FORCAR = process.argv.includes("--forcar");
const fontes = (SO ? SO.split(",").map((n) => TODAS_AS_FONTES[n.trim()]).filter(Boolean) : Object.values(TODAS_AS_FONTES)).map(
  (buscar) => () => buscar({ forcar: FORCAR })
);

async function main() {
  const config = await aplicarConfigDoBanco(supabase);
  if (config.coleta_pausada) {
    console.log("Coleta pausada no painel admin (aba Configurações). Nada foi feito.");
    await registrarExecucao(supabase, "coletar", true, "Pausada no painel admin");
    return;
  }

  const agora = new Date().toISOString();
  const limiteSite = new Date(Date.now() - DIAS_NO_SITE * DIA_MS);
  let publicadas = 0;
  let expiradasPorPreco = 0;
  let renovadas = 0;
  let voltaram = 0;
  const falhas = [];

  // Ofertas dos últimos dias, para reconhecer duplicadas (de qualquer fonte)
  const { data: recentes } = await supabase
    .from("ofertas")
    .select("loja, titulo, preco_atual, id_externo")
    .gte("publicada_em", limiteSite.toISOString())
    .limit(3000);
  const donos = new Map(); // chave da oferta -> id_externo de quem já está no site
  for (const o of recentes ?? []) donos.set(chaveDaOferta(o), o.id_externo);

  // Qualidade da Shopee e do AliExpress (lib/qualidade.mjs, números no painel admin):
  // preço mínimo, desconto máximo (preço "de" inflado) e limite de ofertas no ar por loja
  const qualidade = regrasDeQualidade(config);
  const { data: marketplaceNoAr } = await supabase
    .from("ofertas")
    .select("loja, id_externo, publicada_em, expires_at")
    .eq("ativa", true)
    .in("loja", ["Shopee", "AliExpress", "Aliexpress"])
    .gte("publicada_em", limiteSite.toISOString())
    .limit(5000);
  // Só contam as que ainda não expiraram (as expiradas continuam no banco, mas não ocupam vaga)
  const marketplaceValidas = (marketplaceNoAr ?? []).filter((o) => {
    const expira = momentoExpiracao(o);
    return expira === null || expira > Date.now();
  });
  const jaNoAr = new Set(marketplaceValidas.map((o) => `${o.loja.toLowerCase()}|${o.id_externo}`));
  const vagas = new Map();
  for (const o of marketplaceValidas) vagas.set(o.loja.toLowerCase(), (vagas.get(o.loja.toLowerCase()) ?? 0) + 1);
  for (const [loja, n] of vagas) vagas.set(loja, Math.max(0, maximoNoAr(loja, qualidade) - n));
  let recusadasQualidade = 0;
  let semVaga = 0;

  for (const buscar of fontes) {
    let itens = [];
    try {
      itens = await buscar();
    } catch (erro) {
      console.error("Falha em uma fonte:", erro.message);
      falhas.push(erro.message);
      continue; // uma fonte quebrada não derruba as outras
    }

    const linhas = [];
    for (const item of itens) {
      if (lojaBloqueada(item)) continue; // loja bloqueada (lib/qualidade.mjs)
      // Cupons não têm preço "de": entram direto na aba Cupons
      if (item.categoria === "cupons") {
        linhas.push({ ...item, ativa: true, origem: "automatica", atualizado_em: agora });
        continue;
      }
      if (!item.preco_antigo || item.preco_antigo <= item.preco_atual) continue;

      // Shopee e AliExpress: barato demais ou desconto inflado não entra
      if (motivoDeRecusa(item, qualidade)) {
        recusadasQualidade++;
        continue;
      }
      // Limite de ofertas no ar da loja: só as novas ocupam vaga (as que já estão continuam atualizando)
      if (ehMarketplace(item.loja)) {
        const loja = item.loja.toLowerCase();
        if (!jaNoAr.has(`${loja}|${item.id_externo}`)) {
          const livres = vagas.has(loja) ? vagas.get(loja) : maximoNoAr(loja, qualidade);
          if (livres <= 0) {
            semVaga++;
            continue;
          }
          vagas.set(loja, livres - 1);
        }
      }

      const categoria = item.categoria ?? classificar(item.titulo, item.loja);
      if (!categoria) continue; // sem categoria reconhecida: não publica

      // Desconto mínimo depende da categoria: tecnologia aceita menos (veja lib/prazos.mjs).
      // Uma fonte pode trazer a regra própria (ex.: tecnologia da KaBuM!, no painel).
      const { desconto_minimo: minimoDaFonte, ...dados } = item;
      const desconto = ((item.preco_antigo - item.preco_atual) / item.preco_antigo) * 100;
      if (desconto < Math.round(minimoDaFonte ?? descontoMinimoDa(categoria)) - 0.5) continue;

      linhas.push({
        ...dados,
        categoria,
        ativa: true,
        expires_at: item.expires_at ?? null, // se a oferta voltou, deixa de estar expirada
        origem: "automatica",
        atualizado_em: agora,
      });
    }

    let paraGravar = linhas;
    const paraExpirar = [];
    const paraRenovar = [];

    if (linhas.length > 0) {
      const ids = linhas.map((l) => l.id_externo);

      const { data: existentes } = await supabase
        .from("ofertas")
        .select(
          "id, loja, id_externo, ativa, oculta_manual, publicada_em, expires_at, preco_atual, preco_antigo, preco_conferido_em, renovacoes"
        )
        .in("id_externo", ids);

      // Ofertas que já foram apagadas há pouco tempo não são publicadas de novo
      const { data: removidas } = await supabase
        .from("ofertas_removidas")
        .select("loja, id_externo")
        .gte("removida_em", new Date(Date.now() - DIAS_BLOQUEIO_REPUBLICAR * DIA_MS).toISOString())
        .in("id_externo", ids);
      const removidasSet = new Set((removidas ?? []).map((r) => `${r.loja}|${r.id_externo}`));

      const existentePor = new Map(
        (existentes ?? []).map((o) => [`${o.loja}|${o.id_externo}`, o])
      );

      // Não reativa ofertas que você ocultou no painel nem as que já passaram do prazo no site.
      // Exceção: a oferta que saiu das listas há bastante tempo (podeVoltar) pode voltar, na mesma página.
      const bloqueadas = new Set(
        (existentes ?? [])
          .filter(
            (o) =>
              o.oculta_manual ||
              (o.publicada_em && new Date(o.publicada_em) < limiteSite && !podeVoltar(o))
          )
          .map((o) => o.id_externo)
      );
      paraGravar = linhas.filter(
        (l) => !bloqueadas.has(l.id_externo) && !removidasSet.has(`${l.loja}|${l.id_externo}`)
      );

      // Conferência de preço, de HORAS_ENTRE_CONFERENCIAS em HORAS_ENTRE_CONFERENCIAS horas:
      // - subiu mais de TOLERANCIA_PERCENTUAL %: a oferta fica como Expirada (o preço novo não é gravado)
      // - subiu até a tolerância ou caiu: grava o preço novo e marca a hora da conferência
      // Entre uma conferência e outra, o preço salvo não muda.
      paraGravar = paraGravar.filter((l) => {
        const existente = existentePor.get(`${l.loja}|${l.id_externo}`);
        if (!existente || !existente.publicada_em) {
          l.preco_conferido_em = agora; // oferta nova
          return true;
        }

        // Oferta antiga voltando ao site: entra como nova, mas na mesma página (mesmo id)
        if (podeVoltar(existente)) {
          l.publicada_em = agora;
          l.preco_conferido_em = agora;
          l.renovacoes = 0;
          l.postada_telegram_em = null; // volta para a fila de postagem do canal
          voltaram++;
          return true;
        }

        if (!horaDeConferir(existente)) {
          // ainda não é hora: mantém o preço e a data da última conferência
          l.preco_atual = existente.preco_atual;
          l.preco_antigo = existente.preco_antigo ?? l.preco_antigo;
          l.preco_conferido_em = existente.preco_conferido_em ?? existente.publicada_em;
          return true;
        }

        if (precoSubiu(existente.preco_atual, l.preco_atual)) {
          paraExpirar.push({ loja: l.loja, id_externo: l.id_externo });
          return false;
        }

        // Perto de expirar e ainda com o preço dentro da tolerância: ganha mais dias no site
        if (podeRenovar(existente, l.preco_atual)) paraRenovar.push(existente);

        l.preco_conferido_em = agora;
        return true;
      });
    }

    // Pula duplicadas: mesma loja, título e preço de outra oferta que já está no site
    // (ou que apareceu antes neste mesmo lote). Atualizar a própria oferta continua valendo.
    paraGravar = paraGravar.filter((l) => {
      const chave = chaveDaOferta(l);
      const dono = donos.get(chave);
      if (dono && dono !== l.id_externo) return false;
      donos.set(chave, l.id_externo);
      return true;
    });

    if (paraGravar.length > 0) {
      let { error } = await supabase
        .from("ofertas")
        .upsert(paraGravar, { onConflict: "loja,id_externo" });
      // Banco ainda sem as colunas nota/vendas (supabase-notas.sql não rodado): grava sem elas
      if (error && /\b(nota|vendas)\b/.test(error.message)) {
        ({ error } = await supabase
          .from("ofertas")
          .upsert(paraGravar.map(({ nota: _n, vendas: _v, ...l }) => l), { onConflict: "loja,id_externo" }));
      }
      if (error) console.error("Erro ao gravar:", error.message);
      else publicadas += paraGravar.length;
    }

    // Renovações (gravadas à parte, depois do upsert, para não apagar a data das outras)
    for (const existente of paraRenovar) {
      const { error } = await supabase
        .from("ofertas")
        .update(camposDaRenovacao(existente))
        .eq("id", existente.id);
      if (error) console.error("Erro ao renovar oferta:", error.message);
      else renovadas++;
    }

    for (const oferta of paraExpirar) {
      const { error } = await supabase
        .from("ofertas")
        .update({ expires_at: agora })
        .eq("loja", oferta.loja)
        .eq("id_externo", oferta.id_externo)
        .or(`expires_at.is.null,expires_at.gt.${agora}`);
      if (error) console.error("Erro ao expirar por mudança de preço:", error.message);
      else expiradasPorPreco++;
    }
  }

  // Ofertas automáticas que não apareceram nas últimas 48h (provavelmente acabaram)
  // ficam marcadas como expiradas, em vez de saírem do site.
  // As cadastradas à mão no painel não expiram por aqui.
  const limite = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { error: erroExpirar } = await supabase
    .from("ofertas")
    .update({ expires_at: agora })
    .lt("atualizado_em", limite)
    .eq("origem", "automatica")
    .eq("ativa", true)
    .or(`expires_at.is.null,expires_at.gt.${agora}`);
  if (erroExpirar) console.error("Erro ao marcar ofertas como expiradas:", erroExpirar.message);

  // 🔥 Super desconto: recalcula o limite (só as X% de maior economia ficam com a tag).
  // Precisa do supabase/super-desconto-v2.sql rodado; sem ele, só avisa.
  {
    const { data: superAlteradas, error: erroSuper } = await supabase.rpc("recalcular_super_desconto");
    if (erroSuper) console.warn("[super desconto] Rode o supabase/super-desconto-v2.sql no Supabase:", erroSuper.message);
    else if (superAlteradas) console.log(`[super desconto] ${superAlteradas} ofertas ganharam/perderam a tag.`);
  }

  // As expiradas não são mais apagadas (a página delas continua no ar); só conta as arquivadas
  const limpeza = await limparExpiradas(supabase);

  if (recusadasQualidade || semVaga)
    console.log(
      `Shopee/AliExpress: ${recusadasQualidade} recusadas pelo filtro de qualidade, ` +
        `${semVaga} sem vaga (limite de ofertas no ar da loja).`
    );

  const resumo =
    (SO ? `Só ${SO === "awin" ? "KaBuM!" : SO} (pelo painel): ` : "") +
    `${publicadas} publicadas/atualizadas, ${expiradasPorPreco} expiradas por preço, ` +
    `${renovadas} renovadas, ${voltaram} voltaram, ${limpeza.arquivadas} arquivadas (página mantida)` +
    (falhas.length ? ` | falha: ${falhas.join("; ")}` : "");
  await registrarExecucao(supabase, "coletar", falhas.length === 0, resumo);

  console.log(
    `Coleta concluída: ${publicadas} ofertas publicadas/atualizadas, ` +
      `${expiradasPorPreco} expiradas porque o preço subiu mais de ${TOLERANCIA_PERCENTUAL}% ` +
      `(conferência a cada ${HORAS_ENTRE_CONFERENCIAS}h), ` +
      `${renovadas} renovadas por manter o preço, ` +
      `${voltaram} voltaram ao site na mesma página, ` +
      `${limpeza.arquivadas} fora das listas (expiradas há mais de ${DIAS_EXPIRADA_VISIVEL} dias; páginas mantidas).`
  );
}

main().catch(async (erro) => {
  console.error("Erro na coleta:", erro);
  await registrarExecucao(supabase, "coletar", false, `Erro: ${erro.message}`);
  process.exit(1);
});
