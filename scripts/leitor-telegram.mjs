// LEITOR DE GRUPOS DO TELEGRAM (roda na VPS, com a SUA conta do Telegram).
// Acompanha os grupos/canais de ofertas escolhidos e manda cada oferta nova para o site
// (rota /api/grupos/importar), que troca o link pelo seu link de afiliado e publica.
// Ele SÓ LÊ: não envia mensagens, não reage e não marca nada como lido.
//
// Salve como scripts/leitor-telegram.mjs. Precisa do pacote "telegram" (npm install telegram).
//
// Variáveis no .env.robo:
//   TELEGRAM_API_ID, TELEGRAM_API_HASH   (my.telegram.org → API development tools)
//   TELEGRAM_LEITOR_CHATS                 ids ou @nomes dos grupos/canais, separados por vírgula
//   TELEGRAM_WEBHOOK_SECRET               o mesmo que está na Vercel (protege a rota do site)
//   TELEGRAM_LEITOR_LOJAS                 (opcional) só essas lojas entram, separadas por vírgula.
//                                         Padrão: as lojas em que você é afiliado (lista abaixo). Use "todas" para liberar todas.
//   SITE_URL                              (opcional) padrão https://www.mukiofertas.com.br
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (já existem; usados para guardar as fotos)
//
// Uso:
//   1) Entrar (uma vez):        node --env-file=.env.robo scripts/leitor-telegram.mjs --login
//   2) Ver ids dos grupos:      node --env-file=.env.robo scripts/leitor-telegram.mjs --listar
//   3) Rodar (fica ligado):     node --env-file=.env.robo scripts/leitor-telegram.mjs
//
// A sessão (o "login") fica em ~/.mukiofertas-telegram-sessao, FORA do projeto (não vai para o GitHub).
// Quem tiver esse arquivo entra na sua conta do Telegram: não compartilhe.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import tg from "telegram";
import sessoes from "telegram/sessions/index.js";
import eventos from "telegram/events/index.js";
import { createClient } from "@supabase/supabase-js";

const { TelegramClient } = tg;
const { StringSession } = sessoes;
const { NewMessage } = eventos;

// ===== AJUSTES =====
const SITE = (process.env.SITE_URL || "https://www.mukiofertas.com.br").replace(/\/+$/, "");
const ARQUIVO_SESSAO = path.join(os.homedir(), ".mukiofertas-telegram-sessao");
const BUCKET_FOTOS = "telegram-grupos"; // pasta pública no Supabase Storage (criada sozinha)
const INTERVALO_ENTRE_ENVIOS_MS = 3000; // uma oferta a cada 3 s para o site
// Lojas aceitas: as que o site consegue trocar pelo SEU link de afiliado
// (antes era só a Netshoes, na fase de teste; a variável TELEGRAM_LEITOR_LOJAS no .env.robo ainda manda, se existir)
const LOJAS_PADRAO = "Netshoes,Mercado Livre,Amazon,Shopee,AliExpress,KaBuM!";
const LOJAS = (process.env.TELEGRAM_LEITOR_LOJAS || LOJAS_PADRAO).split(",").map((s) => s.trim()).filter(Boolean);
// ===================

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
if (!apiId || !apiHash) {
  console.log("Faltam TELEGRAM_API_ID e TELEGRAM_API_HASH no .env.robo (pegue em my.telegram.org).");
  process.exit(1);
}

const modo = process.argv.includes("--login") ? "login" : process.argv.includes("--listar") ? "listar" : "rodar";
const sessaoSalva = fs.existsSync(ARQUIVO_SESSAO) ? fs.readFileSync(ARQUIVO_SESSAO, "utf8").trim() : "";
if (!sessaoSalva && modo !== "login") {
  console.log("Ainda não entrou no Telegram. Rode primeiro com --login.");
  process.exit(1);
}

const client = new TelegramClient(new StringSession(sessaoSalva), apiId, apiHash, { connectionRetries: 10 });
client.setLogLevel("error");

// ---------- Login ----------
if (modo === "login") {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await client.start({
    phoneNumber: async () => rl.question("Seu número com DDI e DDD (ex.: +5538999999999): "),
    phoneCode: async () => rl.question("Código que o Telegram mandou: "),
    password: async () => rl.question("Senha de verificação em duas etapas (se tiver): "),
    onError: (e) => console.log("Erro:", e.message),
  });
  rl.close();
  fs.writeFileSync(ARQUIVO_SESSAO, client.session.save(), { mode: 0o600 });
  console.log(`\nPronto! Login salvo em ${ARQUIVO_SESSAO}. Agora rode com --listar para ver os ids dos grupos.`);
  await client.disconnect();
  process.exit(0);
}

await client.connect();

// ---------- Listar grupos e canais ----------
if (modo === "listar") {
  const dialogos = await client.getDialogs({ limit: 300 });
  console.log("\nGrupos e canais da sua conta (copie o id ou o @nome para TELEGRAM_LEITOR_CHATS):\n");
  for (const d of dialogos) {
    if (!d.isGroup && !d.isChannel) continue;
    const tipo = d.isChannel && !d.isGroup ? "canal" : "grupo";
    const nome = d.entity?.username ? `@${d.entity.username}` : "";
    console.log(`  ${String(d.id).padEnd(16)} ${tipo.padEnd(6)} ${d.title} ${nome}`);
  }
  await client.disconnect();
  process.exit(0);
}

// ---------- Rodar ----------
const escolhidos = String(process.env.TELEGRAM_LEITOR_CHATS || "")
  .split(",")
  .map((s) => s.trim().replace(/^@/, "").toLowerCase())
  .filter(Boolean);
if (!escolhidos.length) {
  console.log("TELEGRAM_LEITOR_CHATS está vazio. Rode com --listar e coloque os ids no .env.robo.");
  process.exit(1);
}
if (!process.env.TELEGRAM_WEBHOOK_SECRET) {
  console.log("Falta TELEGRAM_WEBHOOK_SECRET no .env.robo (o mesmo da Vercel).");
  process.exit(1);
}

await client.getDialogs({ limit: 300 }); // carrega os grupos (para reconhecer os ids)

const db =
  process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;
if (db) await db.storage.createBucket(BUCKET_FOTOS, { public: true }).catch(() => {});

// Foto da postagem → Supabase Storage (link público), para a oferta ter imagem até da Amazon
async function guardarFoto(msg) {
  if (!db || !msg.photo) return null;
  try {
    const buffer = await client.downloadMedia(msg, {});
    if (!buffer?.length) return null;
    const nome = `${new Date().toISOString().slice(0, 10)}/${msg.chatId}-${msg.id}.jpg`;
    const { error } = await db.storage.from(BUCKET_FOTOS).upload(nome, buffer, { contentType: "image/jpeg", upsert: true });
    if (error) return null;
    return db.storage.from(BUCKET_FOTOS).getPublicUrl(nome).data.publicUrl;
  } catch {
    return null;
  }
}

// Texto + links escondidos em palavras clicáveis + links de botões
function textoCompleto(msg) {
  const texto = msg.message ?? "";
  const ocultos = (msg.entities ?? []).filter((e) => e.url).map((e) => e.url);
  const botoes = (msg.replyMarkup?.rows ?? []).flatMap((r) => r.buttons ?? []).map((b) => b.url).filter(Boolean);
  return [texto, ...ocultos, ...botoes].join("\n").trim();
}

// Sinal de vida para a aba Saúde do robô (a cada 15 min)
const contagem = { enviadas: 0, publicadas: 0, desde: new Date() };
async function sinalDeVida() {
  if (!db) return;
  await db
    .from("robo_status")
    .upsert({
      script: "leitor-telegram",
      ultima_execucao: new Date().toISOString(),
      ok: true,
      resumo: `Ligado · ${escolhidos.length} canais · ${contagem.enviadas} ofertas lidas e ${contagem.publicadas} publicadas desde ${contagem.desde.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
    })
    .then(() => {}, () => {});
}

// Fila: manda uma oferta por vez para o site
const fila = [];
let trabalhando = false;
async function processarFila() {
  if (trabalhando) return;
  trabalhando = true;
  while (fila.length) {
    const { texto, msg, grupo } = fila.shift();
    try {
      const imagem = await guardarFoto(msg);
      const r = await fetch(`${SITE}/api/grupos/importar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-leitor-secret": process.env.TELEGRAM_WEBHOOK_SECRET },
        body: JSON.stringify({ texto, imagem, grupo, lojas: LOJAS }),
        signal: AbortSignal.timeout(70000),
      });
      const j = await r.json().catch(() => ({}));
      contagem.enviadas++;
      if (r.ok && !j.motivo && j.ok !== false) contagem.publicadas++;
      console.log(`${new Date().toLocaleTimeString("pt-BR")} [${grupo}] ${j.loja ?? ""} → ${r.ok ? j.motivo ?? "publicada" : `erro ${r.status} ${j.motivo ?? ""}`}`);
    } catch (e) {
      console.log(`[${grupo}] falha ao enviar: ${e.message}`);
    }
    await new Promise((res) => setTimeout(res, INTERVALO_ENTRE_ENVIOS_MS));
  }
  trabalhando = false;
}

client.addEventHandler(async (event) => {
  const msg = event.message;
  if (!msg) return;
  const chat = await msg.getChat().catch(() => null);
  const id = String(msg.chatId ?? "");
  const nome = (chat?.username ?? "").toLowerCase();
  if (!escolhidos.includes(id) && !(nome && escolhidos.includes(nome))) return;
  const texto = textoCompleto(msg);
  if (!/https?:\/\//i.test(texto)) return; // sem link: conversa, não é oferta
  fila.push({ texto, msg, grupo: chat?.title ?? id });
  processarFila();
}, new NewMessage({}));

sinalDeVida();
setInterval(sinalDeVida, 15 * 60 * 1000);

console.log(`Leitor ligado. Acompanhando: ${escolhidos.join(", ")} | lojas: ${LOJAS.join(", ")} | site: ${SITE}`);
