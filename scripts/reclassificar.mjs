// Reclassifica as ofertas que já estão no banco com as categorias novas.
// Salve como scripts/reclassificar.mjs (na raiz do projeto) e rode no terminal do VS Code:
//
//   1) Só para ver o que vai mudar (não altera nada):
//      node --env-file=.env.local scripts/reclassificar.mjs
//
//   2) Para gravar as mudanças no Supabase:
//      node --env-file=.env.local scripts/reclassificar.mjs --aplicar
//
// Precisa no .env.local: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
// (a chave service_role fica em Supabase > Project Settings > API; nunca use ela no navegador).

import { createClient } from "@supabase/supabase-js";
import { classificar } from "../lib/classificar.mjs";

const SLUG_OUTROS = "outros"; // mesmo slug de "Outras ofertas" em data/ofertas.js

// Categorias que continuam existindo: se o classificador não reconhecer o título,
// a oferta fica onde está. As que deixaram de existir (ex.: "tecnologia") vão para "outros".
const VALIDAS = new Set([
  "smartphones", "hardware", "perifericos", "computadores", "notebooks", "monitores",
  "games", "cadeiras-mesas", "eletronicos", "casa-inteligente", "redes", "casa", "limpeza",
  "perfumaria", "beleza", "moda", "mochilas", "esporte", SLUG_OUTROS,
]);

const aplicar = process.argv.includes("--aplicar");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !chave) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const supabase = createClient(url, chave, { auth: { persistSession: false } });

// Busca todas as ofertas, de 1000 em 1000
async function buscarTodas() {
  const todas = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("ofertas")
      .select("id, titulo, categoria")
      .order("id")
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    todas.push(...data);
    if (data.length < 1000) break;
  }
  return todas;
}

const ofertas = await buscarTodas();
const mudancas = [];

for (const o of ofertas) {
  const atual = o.categoria;
  const nova = classificar(o.titulo) ?? (VALIDAS.has(atual) ? atual : SLUG_OUTROS);
  if (nova !== atual) mudancas.push({ id: o.id, titulo: o.titulo, de: atual, para: nova });
}

// Resumo por categoria
const resumo = {};
for (const m of mudancas) {
  const chaveResumo = `${m.de ?? "(vazia)"} -> ${m.para}`;
  resumo[chaveResumo] = (resumo[chaveResumo] ?? 0) + 1;
}

console.log(`\n${ofertas.length} ofertas no banco, ${mudancas.length} mudam de categoria.\n`);
console.table(resumo);
console.log("\nExemplos:");
for (const m of mudancas.slice(0, 25)) {
  console.log(`  [${m.de} -> ${m.para}] ${m.titulo}`);
}

if (!aplicar) {
  console.log("\nNada foi gravado. Se estiver tudo certo, rode de novo com --aplicar\n");
  process.exit(0);
}

let ok = 0;
for (const m of mudancas) {
  const { error } = await supabase.from("ofertas").update({ categoria: m.para }).eq("id", m.id);
  if (error) console.error(`Erro na oferta ${m.id}: ${error.message}`);
  else ok++;
}
console.log(`\n${ok} de ${mudancas.length} ofertas atualizadas.\n`);
