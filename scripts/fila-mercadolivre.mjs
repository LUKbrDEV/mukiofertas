// Robô do Mercado Livre: procura os MAIS VENDIDOS das categorias, confere o preço "de" e "por"
// e coloca as boas ofertas na FILA do painel admin (aba "Fila Mercado Livre").
// Lá você copia os links, gera os links de afiliado no painel do ML e cola de volta: o site publica.
// Salve como scripts/fila-mercadolivre.mjs. A VPS roda junto com a coleta (robo-na-vps.sh).
//
// Teste sem gravar nada:  node --env-file=.env.local scripts/fila-mercadolivre.mjs --teste
// Rodar de verdade:       node --env-file=.env.local scripts/fila-mercadolivre.mjs
//
// Precisa: rodar o fila-mercadolivre.sql no Supabase e o token do ML (scripts/ml-token.mjs).

import { createClient } from "@supabase/supabase-js";
import { lerApiML } from "../lib/detalhes-ml.mjs";
import { classificar } from "../lib/classificar.mjs";
import { avaliarDesconto } from "../lib/desconto-confiavel.mjs";
import { lojaBloqueada } from "../lib/qualidade.mjs";
import { aplicarConfigDoBanco, descontoMinimoDa, registrarExecucao } from "../lib/prazos.mjs";

// ===== AJUSTES =====
// Categorias do Mercado Livre visitadas (ids do ML Brasil). A cada execução o robô visita algumas (rodízio).
const CATEGORIAS = [
  { id: "MLB5726", nome: "Eletrodomésticos" },
  { id: "MLB1051", nome: "Celulares e Telefones" },
  { id: "MLB1648", nome: "Informática" },
  { id: "MLB1000", nome: "Eletrônicos, Áudio e Vídeo" },
  { id: "MLB1144", nome: "Games" },
  { id: "MLB1574", nome: "Casa, Móveis e Decoração" },
  { id: "MLB1246", nome: "Beleza e Cuidado Pessoal" },
  { id: "MLB264586", nome: "Saúde" },
  { id: "MLB1276", nome: "Esportes e Fitness" },
  { id: "MLB1384", nome: "Bebês" },
  { id: "MLB1132", nome: "Brinquedos e Hobbies" },
  { id: "MLB1071", nome: "Animais (Pet)" },
  { id: "MLB263532", nome: "Ferramentas" },
  { id: "MLB5672", nome: "Acessórios para Veículos" },
  { id: "MLB1403", nome: "Alimentos e Bebidas" },
  { id: "MLB1196", nome: "Livros, Revistas e Comics" },
];
const CATEGORIAS_POR_EXECUCAO = 4; // 4 categorias a cada 30 min = todas visitadas a cada 2 horas
const PRODUTOS_POR_CATEGORIA = 20; // a lista de mais vendidos tem até 20
const PRECO_MINIMO = 30; // R$ — abaixo disso não vale a pena (carregador de R$ 15...)
const HORAS_NA_FILA = 24; // oferta que ficou mais que isso na fila sem link é descartada (o preço pode ter mudado)
// ===================

const TESTE = process.argv.includes("--teste");
const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function categoriasDaVez() {
  const blocos = Math.ceil(CATEGORIAS.length / CATEGORIAS_POR_EXECUCAO);
  const vez = Math.floor(Date.now() / (30 * 60 * 1000)) % blocos;
  return CATEGORIAS.slice(vez * CATEGORIAS_POR_EXECUCAO, (vez + 1) * CATEGORIAS_POR_EXECUCAO);
}

// Preço, preço "de", nome, foto e página de um item da lista de mais vendidos
async function lerProduto(h) {
  if (h.type === "PRODUCT") {
    const [p, itens] = await Promise.all([lerApiML(`/products/${h.id}`), lerApiML(`/products/${h.id}/items`)]);
    const melhor = (itens?.results ?? []).filter((i) => i.price > 0).sort((a, b) => a.price - b.price)[0];
    const preco = melhor?.price ?? p?.buy_box_winner?.price ?? null;
    const antigo = melhor?.original_price ?? p?.buy_box_winner?.original_price ?? null;
    if (!p?.name || !preco) return null;
    return {
      produto_id: h.id,
      item_id: melhor?.item_id ?? p?.buy_box_winner?.item_id ?? null,
      titulo: p.name,
      preco_atual: preco,
      preco_antigo: antigo,
      imagem: p.pictures?.[0]?.url ?? null,
      url: p.permalink || `https://www.mercadolivre.com.br/p/${h.id}`,
    };
  }
  const it = await lerApiML(`/items/${h.id}`);
  if (!it?.title || !it.price) return null;
  return {
    produto_id: h.id,
    item_id: h.id,
    titulo: it.title,
    preco_atual: it.price,
    preco_antigo: it.original_price ?? null,
    imagem: (it.pictures?.[0]?.secure_url || it.pictures?.[0]?.url || it.thumbnail) ?? null,
    url: it.permalink,
  };
}

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  await aplicarConfigDoBanco(db);

  // 1) limpa a fila: o que passou do prazo sem link é descartado
  if (!TESTE) {
    const limite = new Date(Date.now() - HORAS_NA_FILA * 3600000).toISOString();
    await db.from("ml_fila").update({ status: "descartada", atualizado_em: new Date().toISOString() }).eq("status", "pendente").lt("atualizado_em", limite);
  }

  const candidatas = [];
  const foraPor = {};
  const fora = (m) => (foraPor[m] = (foraPor[m] ?? 0) + 1);

  for (const cat of categoriasDaVez()) {
    const lista = await lerApiML(`/highlights/MLB/category/${cat.id}`);
    if (!lista?.content) {
      console.warn(`[ml] ${cat.nome}: não consegui ler os mais vendidos.`);
      continue;
    }
    let boas = 0;
    for (const h of lista.content.slice(0, PRODUTOS_POR_CATEGORIA)) {
      const p = await lerProduto(h);
      if (!p) { fora("sem preço"); continue; }
      if (!p.preco_antigo || p.preco_antigo <= p.preco_atual) { fora("sem preço \"de\""); continue; }
      if (p.preco_atual < PRECO_MINIMO) { fora(`abaixo de R$ ${PRECO_MINIMO}`); continue; }
      if (lojaBloqueada({ loja: "Mercado Livre", titulo: p.titulo })) { fora("loja bloqueada"); continue; }
      const categoria = classificar(p.titulo, "Mercado Livre");
      if (!categoria || categoria === "cupons") { fora("sem categoria"); continue; }
      const trava = avaliarDesconto({ loja: "Mercado Livre", preco_atual: p.preco_atual, preco_antigo: p.preco_antigo });
      if (!trava.ok) { fora("desconto inflado"); continue; }
      if (trava.desconto < descontoMinimoDa(categoria)) { fora("desconto baixo"); continue; }
      candidatas.push({ ...p, categoria, desconto: trava.desconto });
      boas++;
    }
    console.log(`[ml] ${cat.nome}: ${boas} ofertas boas entre os mais vendidos.`);
  }

  // 2) tira as que já estão no site ou já foram resolvidas na fila
  const ids = candidatas.map((c) => c.produto_id);
  const noSite = new Set();
  const naFila = new Map();
  if (ids.length) {
    const { data: ofertas } = await db.from("ofertas").select("id_externo").in("id_externo", ids.map((i) => `ml-${i}`)).eq("ativa", true);
    for (const o of ofertas ?? []) noSite.add(o.id_externo.slice(3));
    const { data: fila } = await db.from("ml_fila").select("produto_id, status, preco_atual").in("produto_id", ids);
    for (const f of fila ?? []) naFila.set(f.produto_id, f);
  }

  let novas = 0;
  for (const c of candidatas) {
    if (noSite.has(c.produto_id)) { fora("já está no site"); continue; }
    const antes = naFila.get(c.produto_id);
    // publicada ou descartada há pouco: só volta para a fila se o preço caiu
    if (antes && antes.status !== "pendente" && Number(c.preco_atual) >= Number(antes.preco_atual)) { fora("já passou pela fila"); continue; }
    if (TESTE) {
      console.log(`  + ${c.desconto}% | de ${reais(c.preco_antigo)} por ${reais(c.preco_atual)} | ${c.categoria} | ${c.titulo.slice(0, 60)}`);
      novas++;
      continue;
    }
    const { error } = await db.from("ml_fila").upsert(
      { ...c, status: "pendente", oferta_id: null, atualizado_em: new Date().toISOString() },
      { onConflict: "produto_id" }
    );
    if (error) {
      if (/ml_fila/.test(error.message)) throw new Error("Rode o fila-mercadolivre.sql no Supabase (falta a tabela ml_fila).");
      console.warn(`  ✗ ${c.titulo.slice(0, 50)}: ${error.message}`);
      continue;
    }
    novas++;
  }

  const resumo = `${novas} ofertas ${TESTE ? "seriam colocadas" : "na fila"}` +
    (Object.keys(foraPor).length ? ` | fora: ${Object.entries(foraPor).map(([k, n]) => `${n} ${k}`).join(", ")}` : "");
  console.log(`[ml] ${resumo}`);
  if (TESTE) console.log("(teste: nada foi gravado)");
  else await registrarExecucao(db, "fila-mercadolivre", true, resumo);
}

main().catch(async (e) => {
  console.error("[ml] Erro:", e.message);
  process.exit(1);
});
