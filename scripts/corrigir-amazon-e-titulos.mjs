// Arruma as ofertas que JÁ estão no site, antes de pedir de novo o Programa de Associados Amazon:
//   1. Amazon: troca o link pelo link do produto com a SUA tag (mukiofertas09-20).
//      Se não der para achar o produto no link, a oferta sai do site (fica expirada).
//   2. Qualquer loja: oferta com título que não é nome de produto ("até o miojo") sai do site.
//
// Uso (na pasta do projeto, com as variáveis do Supabase carregadas):
//   node --env-file=.env.local scripts/corrigir-amazon-e-titulos.mjs --simular   (só mostra)
//   node --env-file=.env.local scripts/corrigir-amazon-e-titulos.mjs             (aplica)
import { createClient } from "@supabase/supabase-js";
import { linkAmazonComSuaTag, AMAZON_TAG_CERTA } from "../lib/extrair-oferta.mjs";
import { tituloRuim } from "../lib/titulo-ruim.mjs";

const simular = process.argv.includes("--simular");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const agora = new Date().toISOString();

// Só as que estão no ar
const { data, error } = await supabase
  .from("ofertas")
  .select("id, loja, titulo, link, categoria")
  .eq("ativa", true)
  .or(`expires_at.is.null,expires_at.gt.${agora}`)
  .limit(5000);
if (error) {
  console.error("Erro ao ler as ofertas:", error.message);
  process.exit(1);
}

const r = { linksTrocados: 0, linksJaCertos: 0, amazonRetiradas: 0, titulosRetirados: 0 };
const tirar = async (o, motivo) => {
  console.log(`SAI (${motivo}): #${o.id} ${o.loja} | ${o.titulo}`);
  if (!simular) await supabase.from("ofertas").update({ expires_at: agora }).eq("id", o.id);
};

for (const o of data ?? []) {
  if (o.categoria !== "cupons" && tituloRuim(o.titulo)) {
    await tirar(o, "título não é nome de produto");
    r.titulosRetirados++;
    continue;
  }
  if (!/amazon/i.test(String(o.loja ?? ""))) continue;
  if (new RegExp(`[?&]tag=${AMAZON_TAG_CERTA}(&|$)`).test(o.link) && /amazon\.com\.br\/dp\//.test(o.link)) {
    r.linksJaCertos++;
    continue;
  }
  const certo = await linkAmazonComSuaTag(o.link);
  if (!certo) {
    await tirar(o, "link da Amazon sem produto");
    r.amazonRetiradas++;
    continue;
  }
  console.log(`LINK: #${o.id} ${o.link} → ${certo}`);
  if (!simular) await supabase.from("ofertas").update({ link: certo }).eq("id", o.id);
  r.linksTrocados++;
}

console.log(
  `${simular ? "[SIMULAÇÃO] " : ""}Amazon: ${r.linksTrocados} links trocados para a tag ${AMAZON_TAG_CERTA}, ` +
    `${r.linksJaCertos} já estavam certos, ${r.amazonRetiradas} retiradas. ` +
    `Títulos ruins retirados: ${r.titulosRetirados}.`
);
