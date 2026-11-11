// Troca a foto das ofertas do Mercado Livre que entraram com a foto da postagem do grupo do Telegram
// (às vezes caseira) pela foto OFICIAL do Mercado Livre (catálogo ou anúncio, pela API).
// Não abre o seu link de afiliado: o código do produto (MLB...) já está no link salvo.
// Salve como scripts/corrigir-fotos-ml.mjs
//
// Primeiro, só para ver o que mudaria:
//   node --env-file=.env.local scripts/corrigir-fotos-ml.mjs
// Depois, para gravar:
//   node --env-file=.env.local scripts/corrigir-fotos-ml.mjs --aplicar

import { createClient } from "@supabase/supabase-js";
import { extrairOferta } from "../lib/extrair-oferta.mjs";

const APLICAR = process.argv.includes("--aplicar");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Fotos das postagens do Telegram ficam guardadas no Supabase Storage
const { data, error } = await db
  .from("ofertas")
  .select("id, titulo, link, imagem")
  .eq("ativa", true)
  .eq("loja", "Mercado Livre")
  .ilike("imagem", "%supabase.co%")
  .order("id", { ascending: false })
  .limit(1000);
if (error) {
  console.error("Erro ao ler as ofertas:", error.message);
  process.exit(1);
}
console.log(`${data.length} ofertas do Mercado Livre com foto do grupo.${APLICAR ? "" : " (só mostrando: use --aplicar para gravar)"}\n`);

let trocadas = 0;
let semCodigo = 0;
for (const o of data) {
  if (!/MLB-?\d{6,}/i.test(decodeURIComponent(String(o.link)))) {
    semCodigo++; // link sem o código do produto: pular (abrir o link contaria como clique)
    continue;
  }
  const r = await extrairOferta(o.link).catch(() => null);
  if (!r?.imagem || r.imagem === o.imagem) continue;
  console.log(`✓ ${String(o.titulo).slice(0, 70)}\n    ${r.imagem}`);
  if (APLICAR) {
    const { error: e } = await db.from("ofertas").update({ imagem: r.imagem }).eq("id", o.id);
    if (e) {
      console.warn(`    erro ao gravar: ${e.message}`);
      continue;
    }
  }
  trocadas++;
}
console.log(
  `\n${trocadas} fotos ${APLICAR ? "trocadas" : "seriam trocadas"} pela oficial.` +
    (semCodigo ? ` ${semCodigo} puladas (link sem o código do produto).` : "")
);
