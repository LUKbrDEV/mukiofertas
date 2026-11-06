// Publica ~20 produtos da Netshoes (Rakuten) no site para TESTE, enquanto o histórico de preços
// ainda não tem dias suficientes. Entram só com o preço atual (sem preço "de" nem tag de desconto,
// porque a Rakuten não manda o preço antigo) e NÃO são postados no Telegram nem no WhatsApp.
// Elas expiram sozinhas pelas regras normais do site.
//
//   Só ver o que entraria:  node --env-file=.env.local scripts/publicar-teste-netshoes.mjs
//   Publicar de verdade:    node --env-file=.env.local scripts/publicar-teste-netshoes.mjs --aplicar
import { createClient } from "@supabase/supabase-js";
import { buscarBruto, lerItens, converter } from "./fontes/rakuten.mjs";

const QUANTIDADE = 20;
const PALAVRAS = [
  "legging", "top fitness", "conjunto fitness", "camiseta dry fit", "bermuda", "tênis de corrida",
  "tênis feminino", "whey protein", "creatina", "mochila",
];
const POR_PALAVRA = 2;
const aplicar = process.argv.includes("--aplicar");
const mid = /^\d+$/.test(String(process.env.RAKUTEN_MID_NETSHOES ?? "").trim()) ? process.env.RAKUTEN_MID_NETSHOES.trim() : "43984";
const cfg = { loja: "Netshoes", prefixo: "rkt-nts-" };
const chaveModelo = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim().split(" ").slice(0, 5).join(" ");

const escolhidas = [];
const vistos = new Set();
for (const palavra of PALAVRAS) {
  if (escolhidas.length >= QUANTIDADE) break;
  const itens = lerItens(await buscarBruto(palavra, mid, 30));
  let usados = 0;
  for (const p of itens) {
    const o = converter(p, cfg);
    if (!o || !o.imagem) continue;
    const chave = chaveModelo(o.titulo);
    if (vistos.has(o.id_externo) || vistos.has(chave)) continue;
    vistos.add(o.id_externo);
    vistos.add(chave);
    escolhidas.push(o);
    if (++usados >= POR_PALAVRA || escolhidas.length >= QUANTIDADE) break;
  }
  await new Promise((r) => setTimeout(r, 1200));
}

console.log(`${escolhidas.length} produtos da Netshoes ${aplicar ? "sendo publicados" : "que entrariam (teste, nada gravado)"}:\n`);
for (const o of escolhidas) console.log(`- [${o.categoria}] ${o.titulo}\n    R$ ${o.preco_atual.toFixed(2).replace(".", ",")}  ${o.link}`);

if (aplicar && escolhidas.length) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const agora = new Date().toISOString();
  const linhas = escolhidas.map((o) => ({
    ...o,
    preco_antigo: null,
    ativa: true,
    origem: "automatica",
    publicada_em: agora,
    atualizado_em: agora,
    preco_conferido_em: agora,
    expires_at: null,
    // marcadas como já postadas: não vão para o canal do Telegram nem para o grupo do WhatsApp
    postada_telegram_em: agora,
    postada_whatsapp_em: agora,
  }));
  let { error } = await db.from("ofertas").upsert(linhas, { onConflict: "loja,id_externo" });
  if (error && /postada_(telegram|whatsapp)_em/.test(error.message)) {
    // banco sem alguma dessas colunas: grava sem elas
    ({ error } = await db.from("ofertas").upsert(linhas.map(({ postada_telegram_em, postada_whatsapp_em, ...l }) => l), { onConflict: "loja,id_externo" }));
  }
  console.log(error ? `\nErro ao gravar: ${error.message}` : `\nPronto: ${linhas.length} produtos da Netshoes publicados no site.`);
}
