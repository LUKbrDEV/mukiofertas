// Reclassifica as ofertas que já estão no banco com as categorias novas.
// Salve como scripts/reclassificar.mjs (na raiz do projeto) e rode no terminal do VS Code:
//
//   1) Só para ver o que vai mudar (não altera nada):
//      node --env-file=.env.local scripts/reclassificar.mjs
//
//   2) Para gravar as mudanças no Supabase:
//      node --env-file=.env.local scripts/reclassificar.mjs --aplicar
//
// Precisa no .env.local: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
// (a chave service_role fica em Supabase > Project Settings > API; nunca use ela no navegador).

import { createClient } from "@supabase/supabase-js";
import { classificar } from "../lib/classificar.mjs";

// "Outras ofertas" deixou de existir: as ofertas de lá vão para o departamento certo,
// para a aba Cupons (as que são só um cupom) ou ficam sem categoria (só na página inicial).
// Rode com --sem-categoria para ver a lista das que o site ainda não reconhece.

// Categorias que continuam existindo: se o classificador não reconhecer o título,
// a oferta fica onde está. As outras (ex.: "outros", "tecnologia") ficam sem categoria.
const VALIDAS = new Set([
  "ar-condicionado", "eletrodomesticos", "geladeiras", "lavadoras", "micro-ondas", "air-fryer", "fogoes", "eletroportateis",
  "bonecas", "carrinhos", "blocos-de-montar", "jogos-infantis", "pelucias", "educativos", "brinquedos-ao-ar-livre",
  "bicicletas-infantis", "bebes", "passeio-bebe", "alimentacao-bebe", "quarto-bebe", "higiene-bebe", "seguranca-bebe", "escolar-infantil", "eletronicos-infantis", "livros-infantis",
  "academia", "acessorios-carro", "acessorios-pet", "alimentos", "barbear", "bebidas", "cabelos", "cafe", "camping-pesca", "ciclismo", "doces-snacks", "e-readers", "escritorio", "esportes-bola", "ferramentas-eletricas", "ferramentas-manuais", "higiene-pessoal", "higiene-pet", "jardim", "mangas-hqs", "maquiagem", "moto", "pneus-pecas", "racao", "saude", "skate-patins", "skincare", "som-automotivo", "suplementos",
  "acessorios-celular", "acessorios-notebook", "acessorios-monitor", "acessorios-tv",
  "jogos", "controles", "consoles", "fones", "monitor", "televisores", "celulares", "notebook", "tablets", "cama-banho", "sapatos", "brinquedos", "tv", "caixas-de-som", "cameras", "ferramentas",
  "moda-infantil", "moda-masculina", "moda-feminina",
  "processadores", "placa-mae", "ssd", "placa-de-video", "memoria-ram", "gabinete", "relogios", "livros",
  "smartphones", "hardware", "perifericos", "computadores", "notebooks", "monitores",
  "games", "cadeiras-mesas", "eletronicos", "casa-inteligente", "redes", "casa", "limpeza",
  "perfumaria", "beleza", "moda", "mochilas", "esporte", "mercado", "pet", "automotivo", "papelaria", "cupons",
  "outros-informatica", "placas-captura", "filtros-linha", "water-cooler", "fontes",
]);

const aplicar = process.argv.includes("--aplicar");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !chave) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const supabase = createClient(url, chave, { auth: { persistSession: false } });

// Busca todas as ofertas, de 1000 em 1000
async function buscarTodas() {
  const todas = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("ofertas")
      .select("id, titulo, categoria, loja, id_externo")
      .order("id")
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    todas.push(...data);
    if (data.length < 1000) break;
  }
  return todas;
}

const ofertas = await buscarTodas();
const mudancas = [];

for (const o of ofertas) {
  const atual = o.categoria;
  // Cupons (da aba Cupons ou que vieram das redes como cupom) nunca viram produto
  if (atual === "cupons" || /^cp[a-z]-/.test(o.id_externo ?? "")) {
    if (atual !== "cupons") mudancas.push({ id: o.id, titulo: o.titulo, de: atual, para: "cupons" });
    continue;
  }
  let nova = classificar(o.titulo, o.loja) ?? (VALIDAS.has(atual) ? atual : null);
  if (nova === "games") nova = "jogos"; // "Games" e "Jogos" foram unificados em Jogos
  if (nova !== atual) mudancas.push({ id: o.id, titulo: o.titulo, de: atual, para: nova });
}

// Resumo por categoria
const resumo = {};
for (const m of mudancas) {
  const chaveResumo = `${m.de ?? "(sem categoria)"} -> ${m.para ?? "(sem categoria)"}`;
  resumo[chaveResumo] = (resumo[chaveResumo] ?? 0) + 1;
}

console.log(`\n${ofertas.length} ofertas no banco, ${mudancas.length} mudam de categoria.\n`);
console.table(resumo);
console.log("\nExemplos:");
for (const m of mudancas.slice(0, 25)) {
  console.log(`  [${m.de} -> ${m.para}] ${m.titulo}`);
}

if (process.argv.includes("--sem-categoria")) {
  const sem = ofertas.filter((o) => !(classificar(o.titulo, o.loja) ?? (VALIDAS.has(o.categoria) ? o.categoria : null)));
  console.log(`\n${sem.length} ofertas que o site não reconhece (mande esta lista para acrescentar palavras):`);
  for (const o of sem) console.log(`  ${o.titulo}`);
}

if (!aplicar) {
  console.log("\nNada foi gravado. Se estiver tudo certo, rode de novo com --aplicar\n");
  process.exit(0);
}

let ok = 0;
for (const m of mudancas) {
  const { error } = await supabase.from("ofertas").update({ categoria: m.para }).eq("id", m.id);
  if (error) console.error(`Erro na oferta ${m.id}: ${error.message}`);
  else ok++;
}
console.log(`\n${ok} de ${mudancas.length} ofertas atualizadas.\n`);
