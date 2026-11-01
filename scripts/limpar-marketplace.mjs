// Limpa as ofertas da Shopee e do AliExpress que já estão no site e não passam no filtro de
// qualidade (preço muito baixo ou desconto inflado) e, se ainda sobrar mais que o limite de
// ofertas no ar da loja, tira as piores (pela pontuação da vitrine).
// Salve como scripts/limpar-marketplace.mjs e rode na raiz do projeto:
//
//   1) Só para ver o que vai sair (não altera nada):
//      node --env-file=.env.local scripts/limpar-marketplace.mjs
//   2) Para tirar do site:
//      node --env-file=.env.local scripts/limpar-marketplace.mjs --aplicar
//
// As ofertas não são apagadas: ficam desativadas (somem do site e dá para reativar no painel).

import { createClient } from "@supabase/supabase-js";
import { regrasDeQualidade, motivoDeRecusa, maximoNoAr } from "../lib/qualidade.mjs";
import { regrasDaVitrine, pontuar } from "../lib/vitrine.mjs";

const aplicar = process.argv.includes("--aplicar");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: cfg } = await db.from("config_site").select("dados").eq("id", 1).maybeSingle();
const qualidade = regrasDeQualidade(cfg?.dados ?? {});
const vitrine = regrasDaVitrine(cfg?.dados ?? {});

const { data, error } = await db
  .from("ofertas")
  .select("id, loja, titulo, categoria, preco_atual, preco_antigo, cliques, destaque, cupom, publicada_em, id_externo")
  .eq("ativa", true)
  .in("loja", ["Shopee", "AliExpress", "Aliexpress"])
  .limit(5000);
if (error) {
  console.error("Erro:", error.message);
  process.exit(1);
}

const sair = [];
const motivos = {};
const ficam = [];
for (const o of data) {
  const motivo = motivoDeRecusa(o, qualidade);
  if (motivo) {
    const chave = motivo.startsWith("preço") ? "preço baixo" : "desconto inflado";
    motivos[`${o.loja}: ${chave}`] = (motivos[`${o.loja}: ${chave}`] ?? 0) + 1;
    sair.push({ ...o, motivo });
  } else ficam.push(o);
}

// Acima do limite de ofertas no ar: saem as de menor pontuação
for (const loja of [...new Set(ficam.map((o) => o.loja))]) {
  const daLoja = ficam.filter((o) => o.loja === loja).sort((a, b) => pontuar(b, vitrine) - pontuar(a, vitrine));
  const limite = maximoNoAr(loja, qualidade);
  for (const o of daLoja.slice(limite)) {
    motivos[`${loja}: acima do limite de ${limite} no ar`] = (motivos[`${loja}: acima do limite de ${limite} no ar`] ?? 0) + 1;
    sair.push({ ...o, motivo: `acima do limite de ${limite} no ar` });
  }
}

console.log(`\n${data.length} ofertas da Shopee/AliExpress no ar; ${sair.length} vão sair.\n`);
console.table(motivos);
console.log("\nExemplos:");
for (const o of sair.slice(0, 20)) console.log(`  [${o.motivo}] R$ ${o.preco_atual} — ${o.titulo.slice(0, 70)}`);

if (!aplicar) {
  console.log("\nNada foi alterado. Se estiver certo, rode de novo com --aplicar\n");
  process.exit(0);
}
let ok = 0;
const ids = sair.map((o) => o.id);
for (let i = 0; i < ids.length; i += 200) {
  const { error: e } = await db.from("ofertas").update({ ativa: false }).in("id", ids.slice(i, i + 200));
  if (e) console.error("Erro:", e.message);
  else ok += Math.min(200, ids.length - i);
}
console.log(`\n${ok} ofertas desativadas.\n`);
