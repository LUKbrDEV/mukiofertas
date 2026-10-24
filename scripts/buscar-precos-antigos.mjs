import { createClient } from "@supabase/supabase-js";
import { buscarPrecoAntigo } from "../lib/preco-antigo.mjs";

const simular = process.argv.includes("--simular");
const LIMITE = 60; // quantas ofertas verificar por execução

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from("ofertas")
  .select("id, loja, titulo, link, preco_atual")
  .eq("ativa", true)
  .is("preco_antigo", null)
  .not("link", "is", null)
  .in("loja", ["Amazon", "Mercado Livre"])
  .order("publicada_em", { ascending: false })
  .limit(LIMITE);

if (error) {
  console.error("Erro ao buscar ofertas:", error.message);
  process.exit(1);
}

const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let achados = 0;

for (const oferta of data) {
  const antigo = await buscarPrecoAntigo(oferta.link, Number(oferta.preco_atual));

  if (antigo) {
    achados++;
    console.log(`OK    [${oferta.loja}] ${oferta.titulo.slice(0, 55)} | ${oferta.preco_atual} -> antes ${antigo}`);
    if (!simular) {
      const { error: erroUpdate } = await supabase
        .from("ofertas")
        .update({ preco_antigo: antigo })
        .eq("id", oferta.id);
      if (erroUpdate) console.error("Erro ao atualizar", oferta.id, erroUpdate.message);
    }
  } else {
    console.log(`sem   [${oferta.loja}] ${oferta.titulo.slice(0, 55)}`);
  }

  await pausa(1000);
}

console.log(
  simular
    ? `Simulação: ${achados} de ${data.length} ofertas ganhariam preço antigo.`
    : `Pronto: ${achados} de ${data.length} ofertas atualizadas.`
);