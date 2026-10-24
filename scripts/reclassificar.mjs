import { createClient } from "@supabase/supabase-js";
import { classificar } from "../lib/classificar.mjs";

const simular = process.argv.includes("--simular");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from("ofertas")
  .select("id, titulo, categoria")
  .in("origem", ["automatica", "telegram"])
  .limit(5000);

if (error) {
  console.error("Erro ao buscar ofertas:", error.message);
  process.exit(1);
}

let mudancas = 0;
for (const oferta of data) {
  const nova = classificar(oferta.titulo) ?? "outros";
  if (nova === oferta.categoria) continue;

  mudancas++;
  console.log(`${oferta.categoria ?? "(vazia)"} -> ${nova} | ${oferta.titulo.slice(0, 70)}`);

  if (!simular) {
    const { error: erroUpdate } = await supabase
      .from("ofertas")
      .update({ categoria: nova })
      .eq("id", oferta.id);
    if (erroUpdate) console.error("Erro ao atualizar", oferta.id, erroUpdate.message);
  }
}

console.log(
  simular
    ? `Simulação: ${mudancas} ofertas mudariam de categoria.`
    : `Pronto: ${mudancas} ofertas atualizadas.`
);