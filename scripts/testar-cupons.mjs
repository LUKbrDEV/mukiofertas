// Testa a busca de cupons (Lomadee e Awin) sem gravar nada.
// Salve como scripts/testar-cupons.mjs e rode na raiz do projeto:
//   node --env-file=.env.local scripts/testar-cupons.mjs

import { buscar } from "./fontes/cupons.mjs";

console.log("\nBuscando cupons...\n");
const itens = await buscar();
console.log(`\nTotal: ${itens.length} cupons. Exemplos (nada foi gravado):\n`);
for (const c of itens.slice(0, 15)) {
  console.log(`  [${c.loja}] ${c.titulo}`);
  console.log(`    código: ${c.cupom}   válido até: ${c.expires_at.slice(0, 10)}`);
  console.log(`    ${c.link}\n`);
}
