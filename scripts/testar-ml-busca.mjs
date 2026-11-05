// Testa se o seu app do Mercado Livre consegue BUSCAR ofertas pela API (sem o Telegram).
// Usa o mesmo token que o site já usa para os detalhes dos produtos (lib/detalhes-ml.mjs).
// Salve como scripts/testar-ml-busca.mjs e rode no terminal do VS Code:
//   node --env-file=.env.local scripts/testar-ml-busca.mjs
//   node --env-file=.env.local scripts/testar-ml-busca.mjs "air fryer"     (outra busca)
// Não grava nada no banco: só mostra o que a API devolve.

import { lerApiML, ultimoRegistro } from "../lib/detalhes-ml.mjs";

const termo = process.argv[2] || "geladeira";
const q = encodeURIComponent(termo);
const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Cada teste é um jeito diferente de achar produtos na API
const testes = [
  { nome: "Busca de anúncios (sites/MLB/search)", caminho: `/sites/MLB/search?q=${q}&limit=50` },
  { nome: "Busca no catálogo (products/search)", caminho: `/products/search?status=active&site_id=MLB&q=${q}&limit=20` },
  { nome: "Mais vendidos da categoria Eletrodomésticos (highlights)", caminho: `/highlights/MLB/category/MLB5726` },
];

let algumFuncionou = false;

for (const t of testes) {
  console.log(`\n=== ${t.nome} ===`);
  const json = await lerApiML(t.caminho);
  const log = ultimoRegistro().slice(-1)[0] ?? "";
  console.log(`Resposta: ${log}`);
  if (!json) {
    console.log("✗ Bloqueado ou sem resultado para o seu app.");
    continue;
  }
  algumFuncionou = true;

  if (Array.isArray(json.results) && json.results[0]?.price !== undefined) {
    // anúncios com preço: mostra os que têm desconto (preço "de" maior que o "por")
    const comDesconto = json.results
      .filter((i) => i.original_price && i.original_price > i.price)
      .map((i) => ({ ...i, desc: Math.round(((i.original_price - i.price) / i.original_price) * 100) }))
      .sort((a, b) => b.desc - a.desc);
    console.log(`✓ ${json.results.length} anúncios encontrados; ${comDesconto.length} com desconto.`);
    for (const i of comDesconto.slice(0, 8))
      console.log(`  - ${i.desc}% | de ${reais(i.original_price)} por ${reais(i.price)} | ${String(i.title).slice(0, 70)}`);
  } else if (Array.isArray(json.results)) {
    console.log(`✓ ${json.results.length} itens encontrados (sem preço nesta lista).`);
    for (const i of json.results.slice(0, 5)) console.log(`  - ${i.id} ${i.name ?? i.title ?? ""}`.slice(0, 90));
  } else if (Array.isArray(json.content)) {
    console.log(`✓ ${json.content.length} itens na lista de mais vendidos.`);
    for (const i of json.content.slice(0, 5)) console.log(`  - ${i.id} (${i.type})`);
  } else {
    console.log("✓ A API respondeu, mas num formato diferente:", JSON.stringify(json).slice(0, 300));
  }
}

console.log(
  algumFuncionou
    ? "\nResultado: a API do Mercado Livre responde para o seu app. Me mande este resultado para montarmos a fonte automática."
    : "\nResultado: o seu app não tem acesso à busca. Rode o scripts/ml-token.mjs de novo (pode ser token vencido) e teste outra vez."
);
