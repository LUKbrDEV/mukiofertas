// Lista os produtos que a API da Lomadee devolve para uma loja (sem gravar nada no banco).
//   node --env-file=.env.local scripts/testar-loja-lomadee.mjs "Kidy"
import { classificar } from "../lib/classificar.mjs";

const API = "https://api.lomadee.com.br";
const chave = process.env.LOMADEE_API_KEY;
const alvo = process.argv[2] || "Kidy";
if (!chave) { console.log("Falta LOMADEE_API_KEY no .env.local"); process.exit(1); }

const lista = (j) => (Array.isArray(j) ? j : j?.data ?? []);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function chamar(caminho) {
  await esperar(1100);
  const r = await fetch(`${API}${caminho}`, { headers: { "x-api-key": chave, Accept: "application/json" } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}
const reais = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const marcas = lista(await chamar(`/affiliate/brands?search=${encodeURIComponent(alvo)}&limit=20`));
console.log(`Lojas encontradas para "${alvo}": ${marcas.map((m) => m.name).join(", ") || "nenhuma"}`);
if (!marcas.length) process.exit(0);
const marca = marcas.find((m) => m.name.toLowerCase() === alvo.toLowerCase()) ?? marcas.find((m) => m.name.toLowerCase().includes(alvo.toLowerCase())) ?? marcas[0];
console.log(`\nLoja: ${marca.name} (id ${marca.id}) | comissão: ${marca.commission?.value ?? "?"}%`);
for (const c of marca.channels ?? [])
  console.log(`  canal "${c.name}": ${c.shortUrls?.length ? "link liberado" : "sem link"}${c.message ? ` (${c.message})` : ""}`);

const produtos = [];
for (let pagina = 1; pagina <= 3; pagina++) {
  const j = await chamar(`/affiliate/products?organizationIds=${encodeURIComponent(marca.id)}&isAvailable=true&limit=100&page=${pagina}`);
  const itens = lista(j);
  if (pagina === 1) console.log(`Total de produtos na API: ${j?.count ?? j?.meta?.total ?? "?"}`);
  produtos.push(...itens);
  if (itens.length < 100) break;
}
if (!produtos.length) {
  // Confere sem o filtro de disponibilidade e mostra o que a API respondeu
  const bruto = await chamar(`/affiliate/products?organizationIds=${encodeURIComponent(marca.id)}&limit=5&page=1`);
  console.log(`Sem o filtro "disponível": ${lista(bruto).length} produtos | resposta da API: ${JSON.stringify(bruto).slice(0, 300)}`);
  console.log("A Lomadee não tem catálogo de produtos dessa loja na API.");
  process.exit(0);
}

// preços em centavos ou em reais (mesma regra do scripts/fontes/lomadee.mjs)
const valores = produtos.flatMap((p) => (p.options ?? []).flatMap((o) => (o.pricing ?? []).map((x) => Number(x.price)))).filter((v) => v > 0).sort((a, b) => a - b);
const divisor = valores.some((v) => !Number.isInteger(v)) ? 1 : valores[Math.floor(valores.length / 2)] < 1000 ? 1 : 100;

let comDesconto = 0;
const linhas = produtos.map((p) => {
  let melhor = null;
  for (const o of p.options ?? []) for (const x of o.pricing ?? []) {
    const atual = Number(x.price) / divisor, antigo = Number(x.listPrice) / divisor;
    if (!atual) continue;
    const desc = antigo > atual ? Math.round(((antigo - atual) / antigo) * 100) : 0;
    if (!melhor || desc > melhor.desc) melhor = { atual, antigo, desc };
  }
  if (melhor?.desc > 0) comDesconto++;
  return { nome: String(p.name).replace(/\s+/g, " ").trim(), ...melhor, cat: classificar(p.name, marca.name) };
}).sort((a, b) => (b.desc ?? 0) - (a.desc ?? 0));

console.log(`Lidos: ${produtos.length} | com desconto: ${comDesconto} | com 20% ou mais: ${linhas.filter((l) => l.desc >= 20).length}\n`);
for (const l of linhas.slice(0, Number(process.env.MAX_LINHAS) || linhas.length))
  console.log(`- ${l.nome.slice(0, 90)}\n    ${l.atual ? (l.desc ? `De ${reais(l.antigo)} por ${reais(l.atual)} (${l.desc}% OFF)` : reais(l.atual)) : "sem preço"} | categoria no site: ${l.cat ?? "nenhuma (não entraria)"}`);
