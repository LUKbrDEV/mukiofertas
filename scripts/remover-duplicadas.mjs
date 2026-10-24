import { createClient } from "@supabase/supabase-js";
import { chaveDaOferta } from "../lib/duplicadas.mjs";

const simular = process.argv.includes("--simular");
const DIAS_NO_SITE = 5;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const desde = new Date(Date.now() - DIAS_NO_SITE * 24 * 60 * 60 * 1000).toISOString();

const { data, error } = await supabase
  .from("ofertas")
  .select("id, loja, titulo, preco_atual, publicada_em")
  .eq("ativa", true)
  .gte("publicada_em", desde)
  .order("publicada_em", { ascending: true }) // a mais antiga vem primeiro e é a que fica
  .limit(5000);

if (error) {
  console.error("Erro ao buscar ofertas:", error.message);
  process.exit(1);
}

const jaVistas = new Set();
let escondidas = 0;

for (const oferta of data) {
  const chave = chaveDaOferta(oferta);

  if (!jaVistas.has(chave)) {
    jaVistas.add(chave); // primeira = a que fica
    continue;
  }

  escondidas++;
  console.log(`Duplicada: [${oferta.loja}] ${oferta.titulo.slice(0, 70)} (id ${oferta.id})`);

  if (!simular) {
    const { error: erroUpdate } = await supabase
      .from("ofertas")
      .update({ ativa: false, oculta_manual: true })
      .eq("id", oferta.id);
    if (erroUpdate) console.error("Erro ao esconder", oferta.id, erroUpdate.message);
  }
}

console.log(
  simular
    ? `Simulação: ${escondidas} ofertas duplicadas seriam escondidas.`
    : `Pronto: ${escondidas} ofertas duplicadas escondidas.`
);