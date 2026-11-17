// Robô do Pinterest: escolhe as melhores ofertas do site e cria um pin para cada uma
// (foto do produto, título, preço e link para a página da oferta no site, com a chamada
// para o Grupo VIP do WhatsApp na descrição). Nunca repete a mesma oferta.
// Salve como scripts/postar-pinterest.mjs
//
// Ver o que seria postado (não posta nada, não precisa de token):
//   node --env-file=.env.robo scripts/postar-pinterest.mjs --teste
// Ver os seus quadros (para achar o PINTEREST_BOARD_ID):
//   node --env-file=.env.robo scripts/postar-pinterest.mjs --quadros
// Criar um quadro novo:
//   node --env-file=.env.robo scripts/postar-pinterest.mjs --criar-quadro="Achadinhos e ofertas do dia"
// Postar de verdade:
//   node --env-file=.env.robo scripts/postar-pinterest.mjs
//
// Variáveis (.env.robo):
//   PINTEREST_APP_ID, PINTEREST_APP_SECRET       do app em developers.pinterest.com
//   PINTEREST_ACCESS_TOKEN, PINTEREST_REFRESH_TOKEN   saem do scripts/autorizar-pinterest.mjs
//   PINTEREST_BOARD_ID                           quadro onde os pins entram
//   PINTEREST_SANDBOX=1                          opcional: usa o ambiente de teste do Pinterest
//                                                (para gravar o vídeo do pedido de acesso Standard)
//
// O controle do que já foi postado e o token renovado ficam em ~/.mukiofertas/pinterest.json

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// ===== AJUSTES =====
const PINS_POR_EXECUCAO = 2; // rodando a cada 2 horas, dá cerca de 12 pins por dia
const MAXIMO_POR_DIA = 15;
const DESCONTO_MINIMO = 25; // %
const PAUSA_ENTRE_PINS_MS = 20000;
const SITE = "https://www.mukiofertas.com.br"; // endereço do site nos links dos pins
const GRUPO_VIP = process.env.GRUPO_VIP_URL?.trim() || `${SITE}/whatsapp`;
// ===================

const arg = (n) => process.argv.find((a) => a === `--${n}` || a.startsWith(`--${n}=`));
const valor = (n) => arg(n)?.split("=").slice(1).join("=");
const TESTE = Boolean(arg("teste"));
const API = process.env.PINTEREST_SANDBOX === "1" ? "https://api-sandbox.pinterest.com/v5" : "https://api.pinterest.com/v5";
const ESTADO = path.join(os.homedir(), ".mukiofertas", "pinterest.json");
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const desconto = (o) => (o.preco_antigo > o.preco_atual ? Math.round((1 - o.preco_atual / o.preco_antigo) * 100) : 0);
const hojeBR = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);

function lerEstado() {
  try {
    return JSON.parse(fs.readFileSync(ESTADO, "utf8"));
  } catch {
    return { postados: {}, porDia: {}, token: null };
  }
}
function salvarEstado(e) {
  const limite = Date.now() - 90 * 86400000; // esquece ofertas postadas há mais de 90 dias
  for (const [id, quando] of Object.entries(e.postados)) if (quando < limite) delete e.postados[id];
  for (const dia of Object.keys(e.porDia)) if (dia < hojeBR()) delete e.porDia[dia];
  fs.mkdirSync(path.dirname(ESTADO), { recursive: true });
  fs.writeFileSync(ESTADO, JSON.stringify(e, null, 2));
  fs.chmodSync(ESTADO, 0o600);
}

// ---------- token (o de acesso vale 30 dias; o robô renova sozinho com o refresh token)
async function renovarToken(estado) {
  const id = process.env.PINTEREST_APP_ID;
  const segredo = process.env.PINTEREST_APP_SECRET;
  const refresh = estado.token?.refresh || process.env.PINTEREST_REFRESH_TOKEN;
  if (!id || !segredo || !refresh) throw new Error("faltam PINTEREST_APP_ID / PINTEREST_APP_SECRET / PINTEREST_REFRESH_TOKEN para renovar o token");
  const r = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${segredo}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) throw new Error(`não consegui renovar o token: ${j.message ?? r.status} (rode de novo o autorizar-pinterest.mjs)`);
  estado.token = {
    acesso: j.access_token,
    refresh: j.refresh_token || refresh,
    expira: Date.now() + (Number(j.expires_in) || 2592000) * 1000,
    origem: process.env.PINTEREST_ACCESS_TOKEN,
  };
  salvarEstado(estado);
  console.log("[pinterest] token renovado");
  return estado.token.acesso;
}

async function token(estado) {
  const doEnv = process.env.PINTEREST_ACCESS_TOKEN?.trim();
  // um token novo colado no .env.robo vale mais que o salvo
  if (estado.token && estado.token.origem === doEnv && estado.token.acesso) {
    if (estado.token.expira - Date.now() > 2 * 86400000) return estado.token.acesso;
    return renovarToken(estado);
  }
  if (!doEnv) throw new Error("falta PINTEREST_ACCESS_TOKEN (rode o scripts/autorizar-pinterest.mjs)");
  estado.token = { acesso: doEnv, refresh: process.env.PINTEREST_REFRESH_TOKEN, expira: Date.now() + 25 * 86400000, origem: doEnv };
  salvarEstado(estado);
  return doEnv;
}

async function api(estado, caminho, { metodo = "GET", corpo } = {}, tentouRenovar = false) {
  const r = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${await token(estado)}`, ...(corpo ? { "Content-Type": "application/json" } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (r.status === 401 && !tentouRenovar && (estado.token?.refresh || process.env.PINTEREST_REFRESH_TOKEN)) {
    await renovarToken(estado);
    return api(estado, caminho, { metodo, corpo }, true);
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const dica =
      j.code === 29 || /trial access/i.test(j.message ?? "")
        ? " → o app ainda está em acesso Trial: peça o acesso Standard no developers.pinterest.com (ou teste com PINTEREST_SANDBOX=1)"
        : "";
    throw new Error(`Pinterest ${r.status}: ${j.message ?? JSON.stringify(j).slice(0, 200)}${dica}`);
  }
  return j;
}

// ---------- o pin de cada oferta
function montarPin(o) {
  const d = desconto(o);
  const titulo = `${o.titulo}`.replace(/\s+/g, " ").trim().slice(0, 100);
  const linhas = [
    `🔥 ${d}% OFF: de ${reais(o.preco_antigo)} por ${reais(o.preco_atual)}${o.loja ? ` · ${o.loja}` : ""}`,
    o.cupom ? `🎟️ Cupom: ${o.cupom}` : "",
    "Oferta conferida pelo MukiOfertas. Preço sujeito a alteração pela loja.",
    "",
    `🟢 Receba as melhores ofertas no Grupo VIP do WhatsApp (grátis): ${GRUPO_VIP}`,
    "",
    "#achadinhos #promocao #ofertas #mukiofertas",
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "");
  return {
    board_id: process.env.PINTEREST_BOARD_ID,
    title: titulo,
    description: linhas.join("\n").slice(0, 800),
    link: `${SITE}/oferta/${o.id}`,
    alt_text: titulo.slice(0, 500),
    media_source: { source_type: "image_url", url: o.imagem },
  };
}

async function escolherOfertas(estado, quantas) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const agora = new Date().toISOString();
  const { data, error } = await db
    .from("ofertas")
    .select("id, titulo, loja, categoria, preco_atual, preco_antigo, imagem, cupom, publicada_em")
    .eq("ativa", true)
    .not("imagem", "is", null)
    .not("preco_antigo", "is", null)
    .or(`expires_at.is.null,expires_at.gt.${agora}`)
    .order("publicada_em", { ascending: false })
    .limit(400);
  if (error) throw new Error(`Supabase: ${error.message}`);
  const lojasNaRodada = new Set();
  const candidatas = data
    .map((o) => ({ ...o, preco_atual: Number(o.preco_atual), preco_antigo: Number(o.preco_antigo) }))
    .filter((o) => o.preco_atual > 0 && desconto(o) >= DESCONTO_MINIMO && o.categoria !== "cupons")
    .filter((o) => /^https:\/\//i.test(o.imagem ?? ""))
    .filter((o) => !estado.postados[String(o.id)])
    .sort((a, b) => desconto(b) - desconto(a));
  const escolhidas = [];
  for (const o of candidatas) {
    if (escolhidas.length >= quantas) break;
    if (lojasNaRodada.has(o.loja) && candidatas.length > quantas * 3) continue; // varia as lojas
    lojasNaRodada.add(o.loja);
    escolhidas.push(o);
  }
  return escolhidas;
}

async function main() {
  const estado = lerEstado();

  if (arg("quadros")) {
    const j = await api(estado, "/boards?page_size=100");
    if (!j.items?.length) console.log("Nenhum quadro. Crie um com --criar-quadro=\"Achadinhos e ofertas do dia\"");
    for (const b of j.items ?? []) console.log(`${b.id}  ${b.name}`);
    return;
  }
  if (arg("criar-quadro")) {
    const nome = valor("criar-quadro") || "Achadinhos e ofertas do dia";
    const b = await api(estado, "/boards", {
      metodo: "POST",
      corpo: { name: nome, description: "As melhores promoções e achadinhos do dia, conferidos pelo MukiOfertas.", privacy: "PUBLIC" },
    });
    console.log(`Quadro criado. Coloque no .env.robo:\nPINTEREST_BOARD_ID=${b.id}`);
    return;
  }

  const feitosHoje = estado.porDia[hojeBR()] ?? 0;
  const quantas = Math.min(PINS_POR_EXECUCAO, MAXIMO_POR_DIA - feitosHoje);
  if (quantas <= 0 && !TESTE) {
    console.log(`[pinterest] já fiz ${feitosHoje} pins hoje (máximo ${MAXIMO_POR_DIA})`);
    return;
  }
  if (!TESTE && !process.env.PINTEREST_BOARD_ID) throw new Error("falta PINTEREST_BOARD_ID (veja com --quadros)");

  const ofertas = await escolherOfertas(estado, TESTE ? PINS_POR_EXECUCAO : quantas);
  if (!ofertas.length) {
    console.log("[pinterest] nenhuma oferta nova com desconto suficiente");
    return;
  }
  let feitos = 0;
  for (const o of ofertas) {
    const pin = montarPin(o);
    if (TESTE) {
      console.log(`\n--- (teste) ${pin.title}\n${pin.description}\nlink: ${pin.link}\nfoto: ${pin.media_source.url}`);
      continue;
    }
    try {
      const criado = await api(estado, "/pins", { metodo: "POST", corpo: pin });
      estado.postados[String(o.id)] = Date.now();
      estado.porDia[hojeBR()] = (estado.porDia[hojeBR()] ?? 0) + 1;
      salvarEstado(estado);
      feitos++;
      console.log(`[pinterest] ✓ ${desconto(o)}% ${o.titulo.slice(0, 60)} → https://www.pinterest.com/pin/${criado.id}`);
    } catch (e) {
      console.log(`[pinterest] ✗ ${o.titulo.slice(0, 60)}: ${e.message}`);
      if (/Trial|401|403/.test(e.message)) break; // problema de acesso: não adianta tentar as outras
    }
    if (feitos < ofertas.length) await esperar(PAUSA_ENTRE_PINS_MS);
  }
  if (!TESTE) console.log(`[pinterest] ${feitos} pin(s) criados (${estado.porDia[hojeBR()] ?? 0} hoje)`);
}

main().catch((e) => {
  console.error("[pinterest] erro:", e.message);
  process.exit(1);
});
