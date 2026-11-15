// Preenche o "Sobre o produto" (com a IA) das ofertas que já estão no banco e não têm.
// Salve como scripts/preencher-sobre.mjs e rode na raiz do projeto:
//
//   node --env-file=.env.local scripts/preencher-sobre.mjs
//
// Opções:
//   --limite=100   quantas ofertas no máximo (padrão 200)
//   --todas        inclui ofertas que já saíram do ar (padrão: só as ativas)
//   --teste        mostra o que a IA escreveria para 5 ofertas, sem gravar nada
//
// Antes, rode supabase/sobre-ia.sql no Supabase (uma vez só).
// Ofertas do Mercado Livre: use scripts/detalhar-ml.mjs (os detalhes vêm da própria loja).
// Pode rodar quantas vezes quiser: só mexe nas que continuam sem "Sobre".

import { createClient } from "@supabase/supabase-js";
import { gerarSobreIA, iaIndisponivel } from "../lib/sobre-ia.mjs";

const arg = (nome) => process.argv.find((a) => a.startsWith(`--${nome}=`))?.split("=")[1];
const teste = process.argv.includes("--teste");
const todas = process.argv.includes("--todas");
const limite = teste ? 5 : Number(arg("limite")) || 200;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}
if (!process.env.GEMINI_API_KEY) {
  console.error("Falta GEMINI_API_KEY no .env.local (a mesma das frases do WhatsApp)");
  process.exit(1);
}
const supabase = createClient(url, chave, { auth: { persistSession: false } });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// confere se a coluna sobre_ia existe (sem ela, a página mostraria o resumo sem o aviso)
const { error: semColuna } = await supabase.from("ofertas").select("sobre_ia").limit(1);
if (semColuna) {
  console.error("A coluna sobre_ia ainda não existe. Rode supabase/sobre-ia.sql no Supabase primeiro.");
  process.exit(1);
}

let consulta = supabase
  .from("ofertas")
  .select("id, titulo, categoria, loja")
  .is("sobre", null)
  .neq("categoria", "cupons")
  .not("loja", "ilike", "%mercado%livre%")
  .order("id", { ascending: false })
  .limit(limite);
if (!todas) consulta = consulta.eq("ativa", true);
const { data: ofertas, error } = await consulta;

if (error) {
  console.error("Erro ao buscar ofertas:", error.message);
  process.exit(1);
}

console.log(`\n${ofertas.length} ofertas sem "Sobre o produto"${teste ? " (modo teste: nada será gravado)" : ""}.\n`);

let preenchidas = 0;
for (const o of ofertas) {
  if (iaIndisponivel()) {
    console.log("\nA IA parou de responder (chave inválida ou cota grátis do dia acabou). Rode de novo amanhã.");
    break;
  }
  const sobre = await gerarSobreIA({ titulo: o.titulo, categoria: o.categoria });
  if (!sobre) {
    console.log(`  --  ${o.titulo} (a IA não conseguiu um texto dentro das regras)`);
  } else if (teste) {
    console.log(`> ${o.titulo}\n${sobre.map((t) => `   • ${t}`).join("\n")}\n`);
  } else {
    const { error: erro } = await supabase.from("ofertas").update({ sobre, sobre_ia: true }).eq("id", o.id);
    if (erro) console.error(`  Erro na oferta ${o.id}: ${erro.message}`);
    else {
      preenchidas++;
      console.log(`  ok  ${o.titulo} (${sobre.length} tópicos)`);
    }
  }
  await esperar(4500); // a cota grátis do Gemini aceita poucas chamadas por minuto
}

if (!teste) console.log(`\n${preenchidas} de ${ofertas.length} ofertas preenchidas.\n`);
