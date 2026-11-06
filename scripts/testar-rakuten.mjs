// Testa a fonte da Rakuten (Netshoes) sem publicar ofertas (só grava o preço de hoje no histórico de preços).
//   node --env-file=.env.local scripts/testar-rakuten.mjs
//   node --env-file=.env.local scripts/testar-rakuten.mjs "legging" "whey protein"   (palavras à sua escolha)
import { buscar, buscarBruto, lerItens } from "./fontes/rakuten.mjs";

// --bruto: mostra a resposta da API como ela vem (para ver os campos de preço)
if (process.argv.includes("--bruto")) {
  const xml = await buscarBruto("legging", "43984", 3);
  console.log(xml.slice(0, 6000));
  console.log("\n--- Como o robô leu ---");
  console.log(JSON.stringify(lerItens(xml), null, 2));
  process.exit(0);
}

const palavras = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const ofertas = await buscar(palavras.length ? { palavras } : {});
console.log(`\n${ofertas.length} ofertas que entrariam no site:\n`);
for (const o of ofertas) {
  const desconto = Math.round(((o.preco_antigo - o.preco_atual) / o.preco_antigo) * 100);
  console.log(`- [${o.categoria}] ${o.titulo}\n  De R$ ${o.preco_antigo} por R$ ${o.preco_atual} (${desconto}% OFF)\n  ${o.link}\n`);
}
