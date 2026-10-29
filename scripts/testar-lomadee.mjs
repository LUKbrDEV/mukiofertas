// Testa a integração com a Lomadee sem gravar nada no banco.
// Salve como scripts/testar-lomadee.mjs e rode na raiz do projeto:
//   node --env-file=.env.local scripts/testar-lomadee.mjs
// Para investigar uma loja específica:
//   node --env-file=.env.local scripts/testar-lomadee.mjs --marca Shopee

import { buscar, diagnosticarMarca } from "./fontes/lomadee.mjs";

const i = process.argv.indexOf("--marca");
const marca = i >= 0 ? process.argv.slice(i + 1).join(" ") : null;

console.log("\nTestando a Lomadee...");
console.log(`Chave: ${process.env.LOMADEE_API_KEY ? "encontrada" : "NÃO encontrada (confira LOMADEE_API_KEY no .env.local)"}`);

try {
  if (marca) {
    await diagnosticarMarca(marca);
    console.log("");
    process.exit(0);
  }

  console.log(`Canal: ${process.env.LOMADEE_CANAL || "(não definido, usa o primeiro canal com link)"}\n`);
  const itens = await buscar();
  const porLoja = {};
  for (const it of itens) porLoja[it.loja] = (porLoja[it.loja] ?? 0) + 1;
  console.log(`\nTotal: ${itens.length} ofertas prontas. Por loja:`, porLoja);
  console.log("\nExemplos (nada foi gravado):\n");
  for (const it of itens.slice(0, 8)) {
    const desconto = Math.round(((it.preco_antigo - it.preco_atual) / it.preco_antigo) * 100);
    console.log(`  [${it.loja}] ${it.titulo}`);
    console.log(`    R$ ${it.preco_atual} (era R$ ${it.preco_antigo}, -${desconto}%)`);
    console.log(`    ${it.link}\n`);
  }
} catch (erro) {
  console.error("\nErro:", erro.message, "\n");
  process.exit(1);
}
