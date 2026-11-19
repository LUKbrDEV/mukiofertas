// Corrige a etiqueta da Amazon nas ofertas que já estão no banco.
// Salve como scripts/corrigir-tag-amazon.mjs
//
// O código usava "mukiofertas-20", que NÃO é a sua etiqueta. A sua (StoreID do Amazon Associados)
// é "mukiofertas09-20". Este script troca a etiqueta em todas as ofertas da Amazon com link direto.
//
// Teste (só mostra):  node --env-file=.env.robo scripts/corrigir-tag-amazon.mjs --teste
// Corrigir:           node --env-file=.env.robo scripts/corrigir-tag-amazon.mjs

import { createClient } from "@supabase/supabase-js";

const CERTA = process.env.AMAZON_TAG || "mukiofertas09-20";
const TESTE = process.argv.includes("--teste");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ofertas = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await db.from("ofertas").select("id, link").like("link", "%amazon.com.br%").range(de, de + 999);
  if (error) throw new Error(error.message);
  ofertas.push(...data);
  if (data.length < 1000) break;
}

let corrigidas = 0;
for (const o of ofertas) {
  let u;
  try {
    u = new URL(o.link);
  } catch {
    continue;
  }
  if (u.searchParams.get("tag") === CERTA) continue;
  u.searchParams.set("tag", CERTA);
  const novo = u.toString();
  if (TESTE) {
    if (corrigidas < 3) console.log(`  ${o.link}\n  → ${novo}`);
    corrigidas++;
    continue;
  }
  const { error } = await db.from("ofertas").update({ link: novo }).eq("id", o.id);
  if (error) console.warn(`  ✗ oferta ${o.id}: ${error.message}`);
  else corrigidas++;
}
console.log(`[amazon] ${corrigidas} ofertas ${TESTE ? "seriam corrigidas (teste: nada gravado)" : "corrigidas"} para tag=${CERTA}`);
