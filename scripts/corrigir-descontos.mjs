// Corrige as ofertas que já estão no site com desconto inflado ("metade do dobro").
// Salve como scripts/corrigir-descontos.mjs
//
// Ver o que seria mudado (não altera nada):
//   node --env-file=.env.local scripts/corrigir-descontos.mjs --teste
// Aplicar de verdade:
//   node --env-file=.env.local scripts/corrigir-descontos.mjs
//
// Antes da primeira vez, rode o desconto-suspeito.sql no Supabase (SQL Editor).
// Na VPS, rode este script logo depois da coleta, para pegar as ofertas novas.

import { createClient } from "@supabase/supabase-js";
import { avaliarDesconto } from "../lib/desconto-confiavel.mjs";

const TESTE = process.argv.includes("--teste");

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function main() {
  // 1) busca todas as ofertas que têm preço antigo (de 1000 em 1000)
  const suspeitas = [];
  const TAM = 1000;
  for (let de = 0; ; de += TAM) {
    const { data, error } = await db
      .from("ofertas")
      .select("id, titulo, loja, preco_atual, preco_antigo")
      .not("preco_antigo", "is", null)
      .order("id", { ascending: true })
      .range(de, de + TAM - 1);
    if (error) throw new Error(error.message);
    for (const o of data ?? []) {
      const r = avaliarDesconto(o);
      if (!r.ok) suspeitas.push({ o, motivo: r.motivo });
    }
    if (!data || data.length < TAM) break;
  }

  console.log(`[descontos] ${suspeitas.length} ofertas com desconto suspeito.\n`);
  for (const { o, motivo } of suspeitas) {
    console.log(`- [${o.loja}] ${String(o.titulo).slice(0, 60)}`);
    console.log(`    de ${reais(o.preco_antigo)} por ${reais(o.preco_atual)} → ${motivo}`);
  }

  if (TESTE) {
    console.log("\n(teste: nada foi alterado)");
    return;
  }

  // 2) tira o preço antigo e guarda o original
  let corrigidas = 0;
  for (const { o, motivo } of suspeitas) {
    const { error } = await db
      .from("ofertas")
      .update({ preco_antigo: null, preco_antigo_bruto: o.preco_antigo, desconto_suspeito: motivo })
      .eq("id", o.id);
    if (error) {
      if (/preco_antigo_bruto|desconto_suspeito/.test(error.message))
        throw new Error("Rode o desconto-suspeito.sql no Supabase antes (faltam as colunas novas).");
      console.warn(`  ✗ ${o.id}: ${error.message}`);
      continue;
    }
    corrigidas++;
  }
  console.log(`\n[descontos] ${corrigidas} ofertas corrigidas.`);
}

main().catch((e) => {
  console.error("[descontos] Erro:", e.message);
  process.exit(1);
});
