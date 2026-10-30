// Testa a integração com o AliExpress sem gravar nada no banco.
// Salve como scripts/testar-aliexpress.mjs e rode na raiz do projeto:
//   node --env-file=.env.local scripts/testar-aliexpress.mjs
// Para procurar uma palavra específica (e ver o que a API devolve):
//   node --env-file=.env.local scripts/testar-aliexpress.mjs --palavra "fone bluetooth"

import { buscar, buscarPorPalavra, converter, aliexpressConfigurado } from "./fontes/aliexpress.mjs";

const i = process.argv.indexOf("--palavra");
const palavra = i >= 0 ? process.argv.slice(i + 1).join(" ") : null;

console.log("\nTestando o AliExpress...");
console.log(`App Key: ${process.env.ALIEXPRESS_APP_KEY ? "encontrada" : "NÃO encontrada (ALIEXPRESS_APP_KEY no .env.local)"}`);
console.log(`App Secret: ${process.env.ALIEXPRESS_APP_SECRET ? "encontrado" : "NÃO encontrado (ALIEXPRESS_APP_SECRET no .env.local)"}`);
console.log(`Tracking ID: ${process.env.ALIEXPRESS_TRACKING_ID ? "encontrado" : "NÃO encontrado (ALIEXPRESS_TRACKING_ID no .env.local)"}`);
if (!aliexpressConfigurado()) process.exit(1);

try {
  if (palavra) {
    const produtos = await buscarPorPalavra(palavra, 10);
    console.log(`\n"${palavra}": ${produtos.length} produtos. O primeiro, como veio da API:\n`);
    console.log(produtos[0]);
    console.log("\nConvertidos para o site:\n");
    for (const p of produtos) {
      const o = converter(p);
      if (!o) {
        console.log(`  (sem desconto) ${String(p.product_title).slice(0, 70)}`);
        continue;
      }
      console.log(`  ${o.titulo.slice(0, 70)}`);
      console.log(`    R$ ${o.preco_atual} (era R$ ${o.preco_antigo}, -${o._desconto}%) · avaliação ${o._avaliacao}% · ${o._vendas} vendas`);
      console.log(`    ${o.link}`);
    }
    console.log("");
    process.exit(0);
  }

  const itens = await buscar();
  console.log(`\nTotal: ${itens.length} ofertas prontas. Exemplos (nada foi gravado):\n`);
  for (const it of itens.slice(0, 10)) {
    const desconto = Math.round(((it.preco_antigo - it.preco_atual) / it.preco_antigo) * 100);
    console.log(`  ${it.titulo}`);
    console.log(`    R$ ${it.preco_atual} (era R$ ${it.preco_antigo}, -${desconto}%)`);
    console.log(`    ${it.link}\n`);
  }
} catch (erro) {
  console.error("\nErro:", erro.message, "\n");
  process.exit(1);
}
