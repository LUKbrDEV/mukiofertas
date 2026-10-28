import { createClient } from "@supabase/supabase-js";
import { buscar as buscarLomadee } from "./fontes/lomadee.mjs";
import { classificar } from "../lib/classificar.mjs";
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
  podeRenovar,
  camposDaRenovacao,
} from "../lib/prazos.mjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DESCONTO_MINIMO = 20; // só publica acima de 20% de desconto
const DESCONTO_RELAMPAGO = 50; // acima disso, vira "relâmpago" (mesma regra do banco)
const DIA_MS = 24 * 60 * 60 * 1000;

// Lista das fontes ativas. Novas fontes entram aqui.
const fontes = [buscarLomadee];

async function main() {
  const agora = new Date().toISOString();
  const limiteSite = new Date(Date.now() - DIAS_NO_SITE * DIA_MS);
  let publicadas = 0;
  let expiradasPorPreco = 0;
  let renovadas = 0;

  // Ofertas dos últimos dias, para reconhecer duplicadas (de qualquer fonte)
  const { data: recentes } = await supabase
    .from("ofertas")
    .select("loja, titulo, preco_atual, id_externo")
    .gte("publicada_em", limiteSite.toISOString())
    .limit(3000);
  const donos = new Map(); // chave da oferta -> id_externo de quem já está no site
  for (const o of recentes ?? []) donos.set(chaveDaOferta(o), o.id_externo);

  for (const buscar of fontes) {
    let itens = [];
    try {
      itens = await buscar();
    } catch (erro) {
      console.error("Falha em uma fonte:", erro.message);
      continue; // uma fonte quebrada não derruba as outras
    }

    const linhas = [];
    for (const item of itens) {
      if (!item.preco_antigo || item.preco_antigo <= item.preco_atual) continue;

      const desconto = ((item.preco_antigo - item.preco_atual) / item.preco_antigo) * 100;
      if (desconto < DESCONTO_MINIMO) continue;

      const categoria = item.categoria ?? classificar(item.titulo, item.loja);
      if (!categoria) continue; // sem categoria reconhecida: não publica

      linhas.push({
        ...item,
        categoria,
        relampago: desconto > DESCONTO_RELAMPAGO,
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

      // Não reativa ofertas que você ocultou no painel nem as que já passaram do prazo no site
      const bloqueadas = new Set(
        (existentes ?? [])
          .filter(
            (o) => o.oculta_manual || (o.publicada_em && new Date(o.publicada_em) < limiteSite)
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
      const { error } = await supabase
        .from("ofertas")
        .upsert(paraGravar, { onConflict: "loja,id_externo" });
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

  // Apaga as ofertas que já estão expiradas há mais de DIAS_EXPIRADA_VISIVEL dias
  const limpeza = await limparExpiradas(supabase);

  console.log(
    `Coleta concluída: ${publicadas} ofertas publicadas/atualizadas, ` +
      `${expiradasPorPreco} expiradas porque o preço subiu mais de ${TOLERANCIA_PERCENTUAL}% ` +
      `(conferência a cada ${HORAS_ENTRE_CONFERENCIAS}h), ` +
      `${renovadas} renovadas por manter o preço, ` +
      `${limpeza.total} apagadas (expiradas há mais de ${DIAS_EXPIRADA_VISIVEL} dias).`
  );
}

main();