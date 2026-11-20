// Arruma as ofertas que JÁ estão no site sem foto (o card mostrava o logo da loja no lugar do produto).
// Salve como scripts/corrigir-sem-foto.mjs
//
// Para cada produto no ar sem foto (cupons ficam de fora: neles o logo da loja é de propósito):
//   1. tenta achar a foto pelo link (lib/foto-produto.mjs);
//   2. não achou → a oferta sai das listas (expires_at = agora). A página dela continua existindo.
//
// Teste (só mostra):  node --env-file=.env.robo scripts/corrigir-sem-foto.mjs --teste
// Corrigir:           node --env-file=.env.robo scripts/corrigir-sem-foto.mjs
import { createClient } from "@supabase/supabase-js";
import { imagemDoLink } from "../lib/foto-produto.mjs";

const TESTE = process.argv.includes("--teste");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const agora = new Date().toISOString();

const { data, error } = await db
  .from("ofertas")
  .select("id, loja, titulo, link, categoria")
  .is("imagem", null)
  .eq("ativa", true)
  .neq("categoria", "cupons")
  .or(`expires_at.is.null,expires_at.gt.${agora}`)
  .limit(2000);
if (error) {
  console.error("Erro ao ler as ofertas:", error.message);
  process.exit(1);
}

let comFoto = 0;
let retiradas = 0;
for (const o of data ?? []) {
  const foto = await imagemDoLink(o.link).catch(() => null);
  if (foto) {
    console.log(`FOTO: #${o.id} ${o.loja} | ${o.titulo}`);
    if (!TESTE) await db.from("ofertas").update({ imagem: foto }).eq("id", o.id);
    comFoto++;
  } else {
    console.log(`SAI (sem foto): #${o.id} ${o.loja} | ${o.titulo}`);
    if (!TESTE) await db.from("ofertas").update({ expires_at: agora }).eq("id", o.id);
    retiradas++;
  }
}
console.log(
  `${TESTE ? "[TESTE: nada gravado] " : ""}${data?.length ?? 0} produtos sem foto: ${comFoto} ganharam foto, ${retiradas} saíram do site.`
);
