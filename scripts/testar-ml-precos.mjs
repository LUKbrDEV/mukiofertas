// Passo 2 do teste do Mercado Livre: pega os MAIS VENDIDOS de algumas categorias e tenta ler
// o preço "por" e o preço "de" de cada produto (para saber se o robô consegue achar descontos).
// Salve como scripts/testar-ml-precos.mjs e rode:
//   node --env-file=.env.local scripts/testar-ml-precos.mjs
// Não grava nada no banco.

import { lerApiML, ultimoRegistro } from "../lib/detalhes-ml.mjs";

const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const ultimo = () => ultimoRegistro().slice(-1)[0] ?? "";

// algumas categorias para o teste (ids do Mercado Livre Brasil)
const CATEGORIAS = [
  { id: "MLB5726", nome: "Eletrodomésticos" },
  { id: "MLB1051", nome: "Celulares e Telefones" },
  { id: "MLB1648", nome: "Informática" },
];
const POR_CATEGORIA = 6;

for (const cat of CATEGORIAS) {
  console.log(`\n=== Mais vendidos: ${cat.nome} ===`);
  const lista = await lerApiML(`/highlights/MLB/category/${cat.id}`);
  if (!lista?.content) {
    console.log(`✗ Não consegui ler a lista (${ultimo()})`);
    continue;
  }
  for (const h of lista.content.slice(0, POR_CATEGORIA)) {
    let nome = h.id;
    let preco = null;
    let antigo = null;
    let comoAchei = "";

    if (h.type === "PRODUCT") {
      // 1) dados do produto de catálogo (nome e, às vezes, o vencedor da "buy box" com preço)
      const p = await lerApiML(`/products/${h.id}`);
      const r1 = ultimo();
      if (p) {
        nome = p.name ?? nome;
        if (p.buy_box_winner?.price) {
          preco = p.buy_box_winner.price;
          antigo = p.buy_box_winner.original_price ?? null;
          comoAchei = "buy box";
        }
      }
      // 2) se não veio preço, tenta os anúncios do produto
      if (!preco) {
        const itens = await lerApiML(`/products/${h.id}/items`);
        const r2 = ultimo();
        const primeiro = itens?.results?.[0];
        if (primeiro?.price) {
          preco = primeiro.price;
          antigo = primeiro.original_price ?? null;
          comoAchei = "anúncios do produto";
        } else comoAchei = `sem preço (${r1.split("->")[1]?.trim()} / ${r2.split("->")[1]?.trim()})`;
      }
    } else {
      // anúncio comum
      const it = await lerApiML(`/items/${h.id}`);
      if (it) {
        nome = it.title ?? nome;
        preco = it.price ?? null;
        antigo = it.original_price ?? null;
        comoAchei = "anúncio";
      } else comoAchei = `sem preço (${ultimo().split("->")[1]?.trim()})`;
    }

    const desconto = preco && antigo > preco ? Math.round(((antigo - preco) / antigo) * 100) : 0;
    console.log(
      `  - ${String(nome).slice(0, 60)}\n      ${
        preco ? `por ${reais(preco)}${antigo ? ` | de ${reais(antigo)} (${desconto}% OFF)` : " | sem preço \"de\""}` : "—"
      }  [${comoAchei}]`
    );
  }
}
console.log("\nMe mande este resultado: com ele eu sei se dá para o robô achar descontos do Mercado Livre sozinho.");
