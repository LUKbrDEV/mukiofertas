// Lista TODAS as lojas da sua conta na Lomadee: quais já estão aceitas (com link liberado),
// quais estão pendentes ou sem afiliação, e a comissão de cada uma.
// Salve como scripts/listar-lomadee.mjs e rode no terminal do VS Code:
//   node --env-file=.env.local scripts/listar-lomadee.mjs
// Também grava a lista em lomadee-lojas.csv (abre no Excel).

import { writeFileSync } from "node:fs";

const API = "https://api.lomadee.com.br";
const chave = process.env.LOMADEE_API_KEY;
if (!chave) {
  console.error("Falta LOMADEE_API_KEY no .env.local");
  process.exit(1);
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const lista = (json) => (Array.isArray(json) ? json : json?.data ?? []);

async function chamar(caminho) {
  const r = await fetch(`${API}${caminho}`, { headers: { "x-api-key": chave, Accept: "application/json" } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

const marcas = [];
for (let pagina = 1; pagina <= 50; pagina++) {
  const json = await chamar(`/affiliate/brands?page=${pagina}&limit=20`);
  const itens = lista(json);
  marcas.push(...itens);
  const total = json?.meta?.totalPages;
  process.stdout.write(`\rLendo lojas... página ${pagina}${total ? ` de ${total}` : ""}`);
  if (itens.length < 20 || (total && pagina >= total)) break;
  await esperar(1100); // a API aceita 60 chamadas por minuto
}
console.log("\n");

const situacao = (m) => {
  const canais = m.channels ?? [];
  if (canais.some((c) => c.shortUrls?.length && !c.message)) return "ACEITA";
  const msg = canais.map((c) => c.message).find(Boolean);
  return msg ? `não liberada (${msg})` : "não liberada";
};
const comissao = (m) => {
  const v = m.commission?.value;
  if (v === undefined || v === null) return "";
  return m.commission?.type === "fixed" ? `R$ ${v}` : `${v}%`;
};

const linhas = marcas
  .map((m) => ({ nome: String(m.name ?? "").trim(), situacao: situacao(m), comissao: comissao(m) }))
  .sort((a, b) => (a.situacao === "ACEITA" ? 0 : 1) - (b.situacao === "ACEITA" ? 0 : 1) || a.nome.localeCompare(b.nome));

const aceitas = linhas.filter((l) => l.situacao === "ACEITA");
console.log(`Total de lojas na sua conta: ${linhas.length} | aceitas: ${aceitas.length}\n`);
console.log("=== ACEITAS ===");
for (const l of aceitas) console.log(`- ${l.nome}${l.comissao ? `  (${l.comissao})` : ""}`);
console.log("\n=== NÃO LIBERADAS ===");
for (const l of linhas.filter((l) => l.situacao !== "ACEITA")) console.log(`- ${l.nome}  [${l.situacao}]${l.comissao ? `  (${l.comissao})` : ""}`);

const csv = ["Loja;Situação;Comissão", ...linhas.map((l) => `${l.nome};${l.situacao};${l.comissao}`)].join("\n");
writeFileSync("lomadee-lojas.csv", "﻿" + csv);
console.log("\nLista salva em lomadee-lojas.csv");
