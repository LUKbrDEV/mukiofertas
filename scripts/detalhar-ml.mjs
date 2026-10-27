// Preenche "Sobre o produto" e "Especificações" das ofertas do Mercado Livre que já estão no banco.
// Salve como scripts/detalhar-ml.mjs e rode na raiz do projeto:
//
//   node --env-file=.env.local scripts/detalhar-ml.mjs
//
// Para buscar de novo em todas (ex.: depois de conectar a conta com scripts/ml-token.mjs):
//   node --env-file=.env.local scripts/detalhar-ml.mjs --refazer
//
// Para ver o passo a passo de 3 ofertas, sem gravar nada (quando nada é encontrado):
//   node --env-file=.env.local scripts/detalhar-ml.mjs --debug
//
// Só mexe nas ofertas do Mercado Livre que ainda não têm detalhes. Pode rodar quantas vezes quiser.

import { createClient } from "@supabase/supabase-js";
import { buscarDetalhesML, ultimoRegistro } from "../lib/detalhes-ml.mjs";

const debug = process.argv.includes("--debug");
const refazer = process.argv.includes("--refazer"); // busca de novo até nas que já têm detalhes

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}
const supabase = createClient(url, chave, { auth: { persistSession: false } });

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const { data: ofertas, error } = await supabase
  .from("ofertas")
  .select("id, titulo, link")
  .ilike("loja", "%mercado%livre%")
  .or(refazer ? "id.gt.0" : "sobre.is.null,especificacoes.is.null")
  .order("id", { ascending: false })
  .limit(500);

if (error) {
  console.error("Erro ao buscar ofertas:", error.message);
  process.exit(1);
}

console.log(`\n${ofertas.length} ofertas do Mercado Livre ${refazer ? "para buscar de novo" : "sem detalhes completos"}.\n`);

if (debug) {
  console.log(`App do Mercado Livre: ${process.env.ML_CLIENT_ID && process.env.ML_CLIENT_SECRET ? "configurado" : "ML_CLIENT_ID/ML_CLIENT_SECRET não configurados"}\n`);
  for (const o of ofertas.slice(0, 3)) {
    console.log(`> ${o.titulo}\n  link salvo: ${o.link}`);
    const detalhes = await buscarDetalhesML(o.link);
    for (const passo of ultimoRegistro()) console.log(`  - ${passo}`);
    console.log(`  resultado: ${detalhes ? "encontrou detalhes" : "sem detalhes"}\n`);
  }
  console.log("Modo debug: nada foi gravado. Me mande este resultado.\n");
  process.exit(0);
}

let preenchidas = 0;
for (const o of ofertas) {
  const detalhes = await buscarDetalhesML(o.link);
  if (detalhes) {
    const { error: erro } = await supabase
      .from("ofertas")
      .update({ sobre: detalhes.sobre, especificacoes: detalhes.especificacoes })
      .eq("id", o.id);
    if (erro) console.error(`  Erro na oferta ${o.id}: ${erro.message}`);
    else {
      preenchidas++;
      console.log(`  ok  ${o.titulo} (${detalhes.sobre.length} tópicos, ${detalhes.especificacoes.length} especificações)`);
    }
  } else {
    console.log(`  --  ${o.titulo} (sem detalhes)`);
  }
  await esperar(300); // não sobrecarrega a API
}

console.log(`\n${preenchidas} de ${ofertas.length} ofertas preenchidas.\n`);
