import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const LIMITE_POR_EXECUCAO = 10; // evita spam e bloqueio do Telegram

if (!TOKEN || !CHAT_ID) {
  console.error("Faltam TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID.");
  process.exit(1);
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const escapar = (texto) =>
  String(texto).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const preco = (valor) =>
  Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function montarMensagem(o) {
  const desconto = Math.round(((o.preco_antigo - o.preco_atual) / o.preco_antigo) * 100);
  const topo = o.relampago ? "⚡ <b>PROMOÇÃO RELÂMPAGO</b>" : "🔥 <b>OFERTA</b>";

  return [
    topo,
    "",
    escapar(o.titulo),
    "",
    `💰 <b>${preco(o.preco_atual)}</b> <s>${preco(o.preco_antigo)}</s> (-${desconto}%)`,
    `🏬 ${escapar(o.loja)}`,
    "",
    `👉 <a href="${escapar(o.link)}">Ver oferta</a>`,
    "",
    "<i>Link de afiliado. Preço e estoque podem mudar a qualquer momento.</i>",
  ].join("\n");
}

async function enviar(texto) {
  const resposta = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text: texto, parse_mode: "HTML" }),
  });
  const dados = await resposta.json();
  if (!dados.ok) throw new Error(dados.description);
}

async function main() {
  const { data: ofertas, error } = await supabase
    .from("ofertas")
    .select("*")
    .eq("ativa", true)
    .is("postada_telegram_em", null)
    .order("relampago", { ascending: false }) // relâmpagos primeiro
    .order("atualizado_em", { ascending: false })
    .limit(LIMITE_POR_EXECUCAO);

  if (error) {
    console.error("Erro ao buscar ofertas:", error.message);
    process.exit(1);
  }

  let enviadas = 0;
  for (const oferta of ofertas) {
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
    await esperar(3000); // pausa entre mensagens
  }

  console.log(`Telegram: ${enviadas} ofertas enviadas.`);
}

main();