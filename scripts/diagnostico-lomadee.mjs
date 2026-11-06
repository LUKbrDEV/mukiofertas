// Diagnóstico da API de produtos da Lomadee (não grava nada).
//   node --env-file=.env.local scripts/diagnostico-lomadee.mjs
const API = "https://api.lomadee.com.br";
const chave = process.env.LOMADEE_API_KEY;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function chamar(caminho) {
  await esperar(1100);
  const r = await fetch(`${API}${caminho}`, { headers: { "x-api-key": chave, Accept: "application/json" } });
  const t = await r.text();
  return { status: r.status, texto: t, json: (() => { try { return JSON.parse(t); } catch { return null; } })() };
}
const lista = (j) => (Array.isArray(j) ? j : j?.data ?? []);
const mostrar = (rotulo, r) => console.log(`\n### ${rotulo} -> ${r.status}\n${r.texto.slice(0, 1500)}`);

const marcas = await chamar(`/affiliate/brands?search=${encodeURIComponent("Morena Rosa")}&limit=1`);
mostrar("Marca Morena Rosa (objeto completo)", marcas);
const m = lista(marcas.json)[0];

mostrar("Produtos SEM filtro de loja", await chamar(`/affiliate/products?limit=3&page=1`));
if (m) {
  for (const campo of ["organizationIds", "organizationId", "brandIds", "brandId"]) {
    const ids = [...new Set([m.id, m.organizationId, m.organization?.id, m.brandId].filter(Boolean))];
    for (const id of ids) {
      const r = await chamar(`/affiliate/products?${campo}=${encodeURIComponent(id)}&limit=2&page=1`);
      console.log(`\n${campo}=${id} -> ${r.status} | ${lista(r.json).length} produtos | ${r.texto.slice(0, 200)}`);
    }
  }
}
mostrar("Busca de produto por palavra (legging)", await chamar(`/affiliate/products?search=legging&limit=3&page=1`));
mostrar("Lista das suas marcas (1a página)", await chamar(`/affiliate/brands?page=1&limit=20`));
