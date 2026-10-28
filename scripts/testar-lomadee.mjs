// Testa a integração com a Lomadee sem gravar nada no banco.
// Salve como scripts/testar-lomadee.mjs e rode na raiz do projeto:
//   node --env-file=.env.local scripts/testar-lomadee.mjs

import { buscar } from "./fontes/lomadee.mjs";

console.log("\nTestando a Lomadee...");
console.log(`Chave: ${process.env.LOMADEE_API_KEY ? "encontrada" : "NÃO encontrada (confira LOMADEE_API_KEY no .env.local)"}`);
console.log(`Canal: ${process.env.LOMADEE_CANAL || "(não definido, usa o primeiro canal com link)"}\n`);

try {
  const itens = await buscar();
  console.log(`\nTotal: ${itens.length} ofertas prontas. Exemplos (nada foi gravado):\n`);
  for (const i of itens.slice(0, 8)) {
    const desconto = Math.round(((i.preco_antigo - i.preco_atual) / i.preco_antigo) * 100);
    console.log(`  [${i.loja}] ${i.titulo}`);
    console.log(`    R$ ${i.preco_atual} (era R$ ${i.preco_antigo}, -${desconto}%)`);
    console.log(`    ${i.link}\n`);
  }
  if (itens.length === 0) console.log("Nenhuma oferta encontrada. Me mande as linhas acima.\n");
} catch (erro) {
  console.error("\nErro:", erro.message, "\n");
  process.exit(1);
}
