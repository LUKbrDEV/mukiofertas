// Testa a busca do preço "de" de um link (Amazon, Mercado Livre, KaBuM!...) sem gravar nada.
// Salve como scripts/testar-preco-antigo.mjs e rode na raiz do projeto:
//   node --env-file=.env.local scripts/testar-preco-antigo.mjs https://amzn.to/xxxx 38.00
// (o segundo valor é o preço atual da oferta)

import { buscarPrecoAntigoDetalhado } from "../lib/preco-antigo.mjs";

const [link, atual] = process.argv.slice(2);
if (!link || !atual) {
  console.log("Uso: node --env-file=.env.local scripts/testar-preco-antigo.mjs <link> <preço atual>");
  process.exit(1);
}
const r = await buscarPrecoAntigoDetalhado(link, Number(String(atual).replace(",", ".")));
console.log(r.preco ? `\nPreço "de" encontrado: R$ ${r.preco}\n` : `\nNão encontrou: ${r.motivo}\n`);
