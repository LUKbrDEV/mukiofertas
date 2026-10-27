import { createClient } from "@supabase/supabase-js";
import { limparExpiradas } from "../lib/limpeza.mjs";

const simular = process.argv.includes("--simular");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { total, itens } = await limparExpiradas(supabase, { simular });

for (const oferta of itens.slice(0, 50)) {
  console.log(`[${oferta.loja}] ${oferta.titulo.slice(0, 70)}`);
}
if (itens.length > 50) console.log(`... e mais ${itens.length - 50}`);

console.log(
  simular
    ? `Simulação: ${total} ofertas seriam apagadas.`
    : `Pronto: ${total} ofertas apagadas.`
);