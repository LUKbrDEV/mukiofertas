import { createClient } from "@supabase/supabase-js";
import { buscarPrecoAtual } from "../lib/preco-atual.mjs";
import { DIAS_NO_SITE, HORAS_ATE_CONFERIR_PRECO, precoMudou } from "../lib/prazos.mjs";

const simular = process.argv.includes("--simular");
const LIMITE = 150; // quantas ofertas conferir por execução

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const agora = new Date();
const agoraIso = agora.toISOString();
// só ofertas publicadas há pelo menos 1 dia e ainda dentro do prazo do site
const publicadasAntesDe = new Date(agora.getTime() - HORAS_ATE_CONFERIR_PRECO * 3600 * 1000);
const publicadasDepoisDe = new Date(agora.getTime() - DIAS_NO_SITE * 24 * 3600 * 1000);

const { data, error } = await supabase
  .from("ofertas")
  .select("id, loja, titulo, link, preco_atual, publicada_em")
  .eq("ativa", true)
  .lte("publicada_em", publicadasAntesDe.toISOString())
  .gt("publicada_em", publicadasDepoisDe.toISOString())
  .in("loja", ["Amazon", "Mercado Livre"])
  .not("link", "is", null)
  .or(`expires_at.is.null,expires_at.gt.${agoraIso}`) // ainda não expiradas
  .or("origem.is.null,origem.neq.automatica") // as automáticas são conferidas pelo coletor
  .order("publicada_em", { ascending: true })
  .limit(LIMITE);

if (error) {
  console.error("Erro ao buscar ofertas:", error.message);
  process.exit(1);
}

const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let semLeitura = 0;
let mudaram = 0;

for (const oferta of data) {
  const atual = await buscarPrecoAtual(oferta.link, Number(oferta.preco_atual));
  const nome = `[${oferta.loja}] ${oferta.titulo.slice(0, 55)}`;

  if (atual === null) {
    semLeitura++;
    console.log(`sem leitura  ${nome}`);
  } else if (precoMudou(oferta.preco_atual, atual)) {
    mudaram++;
    console.log(`MUDOU        ${nome} | site ${oferta.preco_atual} -> loja ${atual}`);
    if (!simular) {
      const { error: erroUpdate } = await supabase
        .from("ofertas")
        .update({ expires_at: agoraIso })
        .eq("id", oferta.id);
      if (erroUpdate) console.error("Erro ao expirar", oferta.id, erroUpdate.message);
    }
  } else {
    console.log(`igual        ${nome}`);
  }

  await pausa(1000); // pausa entre as lojas para não sobrecarregar
}

console.log(
  `${simular ? "Simulação" : "Pronto"}: ${data.length} conferidas, ` +
    `${mudaram} com preço diferente, ${semLeitura} sem leitura.`
);