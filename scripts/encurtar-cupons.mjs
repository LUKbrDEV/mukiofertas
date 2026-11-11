// Uso único: aplica o prazo curto de ofertas com cupom (HORAS_COM_CUPOM, padrão 12 h) às ofertas
// que já estavam no site com o prazo antigo de dias. Conta a partir da última vez que a oferta
// foi vista no canal (atualizado_em) ou da publicação.
// Salve como scripts/encurtar-cupons.mjs
//
// Primeiro, só para ver:
//   node --env-file=.env.local scripts/encurtar-cupons.mjs
// Depois, para gravar:
//   node --env-file=.env.local scripts/encurtar-cupons.mjs --aplicar

import { createClient } from "@supabase/supabase-js";
import { aplicarConfigDoBanco, HORAS_COM_CUPOM as PADRAO } from "../lib/prazos.mjs";
import * as prazos from "../lib/prazos.mjs";

const APLICAR = process.argv.includes("--aplicar");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
await aplicarConfigDoBanco(db);
const horas = prazos.HORAS_COM_CUPOM ?? PADRAO;
const agora = Date.now();

const { data, error } = await db
  .from("ofertas")
  .select("id, titulo, loja, cupom, categoria, publicada_em, atualizado_em, expires_at")
  .eq("ativa", true)
  .or("cupom.not.is.null,categoria.eq.cupons")
  .or(`expires_at.is.null,expires_at.gt.${new Date(agora).toISOString()}`)
  .limit(2000);
if (error) {
  console.error("Erro ao ler as ofertas:", error.message);
  process.exit(1);
}

let mudadas = 0;
for (const o of data) {
  const base = new Date(o.atualizado_em ?? o.publicada_em ?? agora).getTime();
  const novo = base + horas * 3600000;
  const atual = o.expires_at ? new Date(o.expires_at).getTime() : Infinity;
  if (novo >= atual) continue; // já está dentro do prazo curto
  const quando = novo <= agora ? "expira agora" : `expira em ${Math.round((novo - agora) / 3600000)} h`;
  console.log(`• [${o.loja}] ${String(o.titulo).slice(0, 60)} (${o.cupom ?? "cupom"}) → ${quando}`);
  if (APLICAR) {
    const { error: e } = await db.from("ofertas").update({ expires_at: new Date(Math.max(novo, agora)).toISOString() }).eq("id", o.id);
    if (e) {
      console.warn(`    erro ao gravar: ${e.message}`);
      continue;
    }
  }
  mudadas++;
}
console.log(`\n${mudadas} ofertas com cupom ${APLICAR ? "passaram" : "passariam"} para o prazo de ${horas} h.${APLICAR ? "" : " (use --aplicar para gravar)"}`);
