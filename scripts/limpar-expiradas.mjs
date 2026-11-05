import { createClient } from "@supabase/supabase-js";
import { limparExpiradas } from "../lib/limpeza.mjs";

// As ofertas expiradas não são mais apagadas (a página delas continua no ar).
// Este script só mostra quantas já saíram das listas do site.
const simular = process.argv.includes("--simular");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { arquivadas } = await limparExpiradas(supabase, { simular });

console.log(
  `${arquivadas} ofertas expiradas já saíram das listas do site. ` +
    `Nenhuma foi apagada: a página de cada uma continua no ar.`
);
