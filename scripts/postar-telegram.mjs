import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const CHAT_ID = process.env.TELEGRAM_CHAT_ID?.trim();
// Opcional: endereço do site (ex.: https://mukiofertas.vercel.app). Com ele, os links do
// Telegram passam pelo site e os cliques vindos do canal aparecem no painel admin.
const SITE_URL = process.env.SITE_URL?.trim().replace(/\/$/, "");

const LIMITE_POR_EXECUCAO = 15; // sobe aos poucos, vendo a reação do canal
const DESCONTO_MINIMO_TELEGRAM = 25; // o site mostra tudo; o canal só o que vale a pena
const PAUSA_ENTRE_MENSAGENS_MS = 3200; // cerca de 18 mensagens por minuto

if (!TOKEN || !CHAT_ID) {
  console.error("Faltam TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID.");
  process.exit(1);
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const escapar = (texto) =>
  String(texto).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const preco = (valor) =>
  Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const descontoDe = (o) =>
  o.preco_antigo && o.preco_antigo > o.preco_atual
    ? Math.round(((o.preco_antigo - o.preco_atual) / o.preco_antigo) * 100)
    : 0;

function montarMensagem(o) {
  const desconto = descontoDe(o);
  const topo = o.relampago
    ? "⚡ <b>PROMOÇÃO RELÂMPAGO</b>"
    : o.selo
      ? `🔥 <b>${escapar(o.selo.toUpperCase())}</b>`
      : "🔥 <b>OFERTA</b>";
  const destino = SITE_URL ? `${SITE_URL}/ir/${o.id}?o=telegram` : o.link;
  const linhaPreco =
    desconto > 0
      ? `💰 <b>${preco(o.preco_atual)}</b> <s>${preco(o.preco_antigo)}</s> (-${desconto}%)`
      : `💰 <b>${preco(o.preco_atual)}</b>`;

  return [
    topo,
    "",
    escapar(o.titulo),
    "",
    linhaPreco,
    `🏬 ${escapar(o.loja)}`,
    o.cupom ? `🎟️ Cupom: <code>${escapar(o.cupom)}</code>` : null,
    "",
    `👉 <a href="${escapar(destino)}">Ver oferta</a>`,
    "",
    "<i>Link de afiliado. Preço e estoque podem mudar a qualquer momento.</i>",
  ]
    .filter((linha) => linha !== null)
    .join("\n");
}

async function enviar(texto, tentativa = 1) {
  const resposta = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text: texto, parse_mode: "HTML" }),
  });
  const dados = await resposta.json();
  if (dados.ok) return;

  // O Telegram pediu para esperar: espera e tenta de novo
  if (dados.error_code === 429 && tentativa <= 3) {
    const segundos = (dados.parameters?.retry_after ?? 5) + 1;
    console.log(`Telegram pediu para esperar ${segundos}s...`);
    await esperar(segundos * 1000);
    return enviar(texto, tentativa + 1);
  }
  throw new Error(dados.description);
}

async function main() {
  const { data, error } = await supabase
    .from("ofertas")
    .select("*")
    .eq("ativa", true)
    .is("postada_telegram_em", null)
    .order("relampago", { ascending: false }) // relâmpagos primeiro
    .order("atualizado_em", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Erro ao buscar ofertas:", error.message);
    process.exit(1);
  }

  // Ofertas cadastradas à mão (ou aprovadas da comunidade) sempre passam; as automáticas precisam do desconto mínimo
  const pendentes = (data ?? [])
    .filter((o) => ["manual", "comunidade"].includes(o.origem) || descontoDe(o) >= DESCONTO_MINIMO_TELEGRAM)
    .slice(0, LIMITE_POR_EXECUCAO);

  let enviadas = 0;
  for (const oferta of pendentes) {
    try {
      await enviar(montarMensagem(oferta));
      await supabase
        .from("ofertas")
        .update({ postada_telegram_em: new Date().toISOString() })
        .eq("id", oferta.id);
      enviadas++;
    } catch (erro) {
      console.error(`Falha ao postar "${oferta.titulo}":`, erro.message);
    }
    await esperar(PAUSA_ENTRE_MENSAGENS_MS);
  }

  console.log(`Telegram: ${enviadas} ofertas enviadas.`);
}

main();
