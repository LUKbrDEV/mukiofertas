import { createClient } from "@supabase/supabase-js";
import { buscar as buscarLomadee } from "./fontes/lomadee.mjs";
import { classificar } from "../lib/classificar.mjs";
import { chaveDaOferta } from "../lib/duplicadas.mjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DESCONTO_MINIMO = 35; // só publica acima de 35% de desconto
const DESCONTO_RELAMPAGO = 60; // acima disso, vira "relâmpago"
const DIAS_NO_SITE = 2; // depois desse tempo, a oferta fica como "Expirado" no site

// Lista das fontes ativas. Novas fontes entram aqui.
const fontes = [buscarLomadee];

async function main() {
  const agora = new Date().toISOString();
  const limiteSite = new Date(Date.now() - DIAS_NO_SITE * 24 * 60 * 60 * 1000);
  let publicadas = 0;

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

      const categoria = item.categoria ?? classificar(item.titulo);
      if (!categoria) continue; // sem categoria reconhecida: não publica

      linhas.push({
        ...item,
        categoria,
        relampago: desconto >= DESCONTO_RELAMPAGO,
        ativa: true,
        expires_at: item.expires_at ?? null, // se a oferta voltou, deixa de estar expirada
        origem: "automatica",
        atualizado_em: agora,
      });
    }

    // Não reativa ofertas que você ocultou no painel nem as que já passaram do prazo no site
    let paraGravar = linhas;
    if (linhas.length > 0) {
      const { data: existentes } = await supabase
        .from("ofertas")
        .select("id_externo, oculta_manual, publicada_em")
        .in("id_externo", linhas.map((l) => l.id_externo));
      const bloqueadas = new Set(
        (existentes ?? [])
          .filter(
            (o) => o.oculta_manual || (o.publicada_em && new Date(o.publicada_em) < limiteSite)
          )
          .map((o) => o.id_externo)
      );
      paraGravar = linhas.filter((l) => !bloqueadas.has(l.id_externo));
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

  console.log(`Coleta concluída: ${publicadas} ofertas publicadas/atualizadas.`);
}

main();