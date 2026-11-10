// Testa o feed da Awin (KaBuM! e Dafiti) sem gravar nada no banco.
// Só uma loja: acrescente --loja dafiti (ou --loja kabum)
// Salve como scripts/testar-awin.mjs e rode na raiz do projeto:
//   node --env-file=.env.local scripts/testar-awin.mjs
// Mostrar as colunas e a primeira linha do feed (para conferir o formato):
//   node --env-file=.env.local scripts/testar-awin.mjs --colunas
// Testar a leitura do preço "de" numa página da KaBuM!:
//   node scripts/testar-awin.mjs --pagina https://www.kabum.com.br/produto/110268/headphone-philco-pfo02p-56605003

process.env.AWIN_TESTE = "1"; // o teste não expira nenhuma oferta
const { buscar, baixarFeed, baixarFeedEmPartes, feedsConfigurados, lerPrecoDe } = await import("./fontes/awin.mjs");

const iPagina = process.argv.indexOf("--pagina");
if (iPagina > -1) {
  const url = process.argv[iPagina + 1];
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });
  const html = await r.text();
  console.log(`\nA loja respondeu ${r.status} (${html.length} caracteres).`);
  console.log(`Preço "de" encontrado: ${lerPrecoDe(html) ?? "nenhum"}\n`);
  process.exit(0);
}

const iLoja = process.argv.indexOf("--loja");
const apenas = iLoja > -1 ? process.argv[iLoja + 1] : null;
console.log(`\nTestando a Awin${apenas ? ` (só ${apenas})` : ""}...`);
const feeds = feedsConfigurados(apenas);
if (!feeds.length) {
  console.log("Nenhum feed encontrado: coloque AWIN_FEED_KABUM / AWIN_FEED_DAFITI_FEMININO / _MASCULINO / _KIDS no .env.local (endereço do Create-a-Feed).");
  process.exit(1);
}

try {
  // Feeds leves (Dafiti): o catálogo é enorme, então o teste só roda a busca (lê aos poucos)
  if (feeds.every((f) => f.leve) && !process.argv.includes("--colunas")) {
    const itens = await buscar({ forcar: true, apenas });
    console.log(`\nTotal: ${itens.length} ofertas prontas (nada foi gravado):\n`);
    for (const it of itens) {
      const desconto = Math.round(((it.preco_antigo - it.preco_atual) / it.preco_antigo) * 100);
      console.log(`  [${it.categoria}] ${it.titulo}\n    R$ ${it.preco_atual} (era R$ ${it.preco_antigo}, -${desconto}%)\n`);
    }
    process.exit(0);
  }
  if (process.argv.includes("--colunas")) {
    for (const f of feeds) {
      // lê aos poucos e mostra só a primeira linha (serve para catálogos enormes)
      let primeira = null;
      const total = await baixarFeedEmPartes(process.env[f.variavel], (l) => (primeira ??= l));
      console.log(`\n${f.loja}${f.dica ? ` (${f.dica})` : ""}: ${total} produtos. Colunas: ${Object.keys(primeira ?? {}).join(", ")}`);
      console.log("\nPrimeira linha:\n", primeira);
    }
    process.exit(0);
  }

  // Diagnóstico: por que os produtos do feed não viram oferta
  for (const f of feeds) {
    const linhas = await baixarFeed(process.env[f.variavel]);
    const n = (v) => {
      const t = String(v ?? "").replace(/[^\d.,]/g, "");
      const x = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
      return x > 0 ? x : null;
    };
    const motivos = { "sem preço atual": 0, "sem preço antigo (product_price_old/rrp_price vazios)": 0, "preço antigo igual ou menor": 0, "sem estoque": 0, "sem link": 0, "com desconto": 0 };
    for (const l of linhas) {
      const atual = n(l.search_price ?? l.price ?? l.store_price);
      const antigo = n(l.product_price_old) ?? n(l.rrp_price);
      if (!atual) motivos["sem preço atual"]++;
      else if (!antigo) motivos["sem preço antigo (product_price_old/rrp_price vazios)"]++;
      else if (antigo <= atual) motivos["preço antigo igual ou menor"]++;
      else if (/^(0|false|no)$/i.test(l.in_stock ?? "")) motivos["sem estoque"]++;
      else if (!(l.aw_deep_link || l.merchant_deep_link)) motivos["sem link"]++;
      else motivos["com desconto"]++;
    }
    console.log(`\n${f.loja}: ${linhas.length} produtos no feed. Colunas com preço: ${Object.keys(linhas[0] ?? {}).filter((c) => /price|preco|saving|discount/i.test(c)).join(", ") || "nenhuma"}`);
    console.table(motivos);

    // Quantos produtos têm cada coluna de preço preenchida, e 5 exemplos
    const colunasPreco = Object.keys(linhas[0] ?? {}).filter((c) => /price|saving|discount/i.test(c));
    const preenchidas = Object.fromEntries(colunasPreco.map((c) => [c, linhas.filter((l) => String(l[c] ?? "").trim()).length]));
    console.log("\nQuantos produtos têm cada coluna de preço preenchida:");
    console.table(preenchidas);
    console.log("Exemplos (5 produtos):");
    console.table(
      linhas.slice(0, 5).map((l) => ({
        produto: String(l.product_name).slice(0, 35),
        ...Object.fromEntries(colunasPreco.map((c) => [c, l[c]])),
      }))
    );
  }

  const itens = await buscar({ forcar: true, apenas });
  console.log(`\nTotal: ${itens.length} ofertas prontas. Exemplos (nenhuma oferta foi gravada; só os preços entram no histórico):\n`);
  for (const it of itens.slice(0, 12)) {
    const desconto = Math.round(((it.preco_antigo - it.preco_atual) / it.preco_antigo) * 100);
    console.log(`  [${it.categoria}] ${it.titulo}`);
    console.log(`    R$ ${it.preco_atual} (era R$ ${it.preco_antigo}, -${desconto}%)`);
    console.log(`    ${it.link}\n`);
  }
} catch (erro) {
  console.error("\nErro:", erro.message, "\n");
  process.exit(1);
}
