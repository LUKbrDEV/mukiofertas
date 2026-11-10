// Corrige, de uma vez, os "produtos com cupom" que foram gravados como cupom
// (ex.: "De R$ 4.500 por R$ 3.750 com cupom AFFNOV09 - PlayStation 5 ...").
// Vira oferta normal: título do produto, preço de/por, cupom, categoria e foto (AliExpress).
//
// Ver o que vai mudar:   node --env-file=.env.robo scripts/corrigir-cupons-produto.mjs
// Aplicar de verdade:    node --env-file=.env.robo scripts/corrigir-cupons-produto.mjs --aplicar
import { createClient } from "@supabase/supabase-js";
import { classificar } from "../lib/classificar.mjs";
import { produtoComCupom } from "../lib/titulo-cupom.mjs";
import { detalhesAliExpress } from "./fontes/aliexpress-imagem.mjs";

const APLICAR = process.argv.includes("--aplicar");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await db
  .from("ofertas")
  .select("id, loja, titulo, cupom, link, imagem")
  .eq("categoria", "cupons")
  .limit(2000);
if (error) throw new Error(error.message);

const mudancas = [];
for (const o of data ?? []) {
  const p = produtoComCupom(o.titulo);
  if (!p) continue;
  const categoria = classificar(p.nome, o.loja);
  if (!categoria || categoria === "cupons") {
    console.log(`  (sem categoria, fica como cupom) #${o.id} ${p.nome}`);
    continue;
  }
  mudancas.push({
    o,
    novo: {
      titulo: p.nome.slice(0, 200),
      categoria,
      preco_atual: p.por,
      preco_antigo: p.de,
      cupom: o.cupom || p.codigo,
      sobre: null,
    },
  });
}

// foto do produto e preço "de" do AliExpress (o formato "Por: R$ ..." não traz o preço "de";
// e a imagem gravada num cupom costuma ser só a logo da loja)
const doAli = mudancas.filter((m) => /aliexpress/i.test(m.o.loja ?? ""));
const detalhes = await detalhesAliExpress(doAli.map((m) => ({ m, link: m.o.link })));
for (const [pedido, d] of detalhes) {
  const { novo } = pedido.m;
  if (d.foto) novo.imagem = d.foto;
  if (!novo.preco_antigo) {
    const de = Math.max(d.original || 0, d.venda || 0);
    if (de > novo.preco_atual) novo.preco_antigo = Math.round(de * 100) / 100;
  }
}
// sem preço "de" ou sem foto não vira produto (continua cupom)
for (let i = mudancas.length - 1; i >= 0; i--) {
  const { o, novo } = mudancas[i];
  if (!novo.preco_antigo || !(novo.imagem || o.imagem)) {
    console.log(`  (sem preço "de" ou sem foto, fica como cupom) #${o.id} ${novo.titulo}`);
    mudancas.splice(i, 1);
  }
}

for (const { o, novo } of mudancas) {
  console.log(
    `#${o.id} ${novo.titulo} | ${novo.categoria} | de R$ ${novo.preco_antigo} por R$ ${novo.preco_atual} | cupom ${novo.cupom} | foto: ${novo.imagem || o.imagem ? "sim" : "não"}`
  );
  if (APLICAR) {
    const { error: e } = await db.from("ofertas").update(novo).eq("id", o.id);
    if (e) console.log(`   erro: ${e.message}`);
  }
}
console.log(
  `\n${mudancas.length} produto(s) com cupom encontrados. ${APLICAR ? "Corrigidos." : "Nada foi alterado: rode de novo com --aplicar."}`
);
