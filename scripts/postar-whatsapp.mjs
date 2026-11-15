// Envia as ofertas novas do site para o grupo do WhatsApp, pela Evolution API (VPS da Oracle).
// Salve como scripts/postar-whatsapp.mjs. Roda no GitHub Actions a cada 30 minutos (coleta.yml).
//
// O que faz:
//   1) lê as regras do painel admin (Configurações → WhatsApp): grupo, modelo da mensagem, limites
//   2) pega as ofertas que entraram no site nas últimas horas e ainda não foram para o WhatsApp
//   3) manda cada uma (com foto) para o grupo, com um intervalo entre as mensagens
//   4) marca a oferta como enviada (coluna postada_whatsapp_em), para não repetir
//
// Variáveis (no .env.local e nos Secrets do GitHub):
//   EVOLUTION_URL        ex.: https://129-151-10-20.sslip.io   (o instalar.sh mostra no final)
//   EVOLUTION_API_KEY    a chave que o instalar.sh gerou
//   EVOLUTION_INSTANCIA  o nome que você deu à conexão no painel da Evolution (ex.: mukiofertas)
//   SITE_URL             ex.: https://www.mukiofertas.com.br
//
// Testar sem enviar nada (mostra as mensagens que iriam):
//   node --env-file=.env.local scripts/postar-whatsapp.mjs --teste

import { createClient } from "@supabase/supabase-js";
import { aplicarConfigDoBanco, CONFIG_ROBO, registrarExecucao } from "../lib/prazos.mjs";
import { camposDaOferta, montarMensagem, MODELO_PADRAO, MODELO_CUPOM_PADRAO } from "../lib/whatsapp-modelo.mjs";
import { gerarFrase, ESTILO_PADRAO } from "../lib/frase-ia.mjs";
import { fotoComMarcaDagua } from "../lib/marca-dagua.mjs";
import { writeFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Memória local das frases (reserva para quando a coluna frase_whatsapp não existe ou falha)
const ARQUIVO_FRASES = fileURLToPath(new URL("../data/frases-whatsapp-recentes.json", import.meta.url));
function lerFrasesLocais() {
  try {
    return existsSync(ARQUIVO_FRASES) ? JSON.parse(readFileSync(ARQUIVO_FRASES, "utf8")) : [];
  } catch {
    return [];
  }
}
function salvarFrasesLocais(lista) {
  try {
    mkdirSync(dirname(ARQUIVO_FRASES), { recursive: true });
    writeFileSync(ARQUIVO_FRASES, JSON.stringify(lista.slice(0, 60), null, 1));
  } catch (e) {
    console.warn(`[whatsapp] não consegui salvar as frases recentes (${e.message})`);
  }
}
import sharp from "sharp";
import { tituloDoCupom } from "../lib/titulo-cupom.mjs";
import { PADRAO_GRUPO_WHATSAPP, camposDoGrupo } from "../lib/compra-em-grupo-whatsapp.mjs";
import { PADRAO_GRUPO, niveisDoGrupo, nivelDaOferta, bonusPorCliques, pontuarParaGrupo } from "../lib/grupo-whatsapp.mjs";

// Valores padrão (o painel admin pode trocar)
const PADRAO = {
  whatsapp_ativo: false,
  whatsapp_grupo: "", // id do grupo, ex.: 120363012345678901@g.us (o testar-whatsapp.mjs lista os seus grupos)
  whatsapp_modelo: MODELO_PADRAO,
  whatsapp_modelo_cupom: MODELO_CUPOM_PADRAO,
  whatsapp_enviar_cupons: true,
  whatsapp_cupons_por_hora: 2, // (só quando os cupons NÃO vão agrupados) vagas reservadas para cupons avulsos
  whatsapp_cupons_agrupados: true, // cupons vão num "pacote" por loja: capa da loja + vários cupons numa mensagem
  whatsapp_cupons_por_pacote: 5, // cupons em cada mensagem
  whatsapp_horas_entre_pacotes: 4, // a mesma loja só manda outro pacote depois de X horas
  whatsapp_pacotes_por_hora: 1, // pacotes de cupons por hora (todas as lojas somadas)
  whatsapp_com_foto: true,
  whatsapp_max_por_execucao: 5, // o robô roda a cada 30 min: 5 por vez = até 10 por hora
  whatsapp_max_por_hora: 10,
  whatsapp_intervalo_segundos: 40, // espera entre uma mensagem e outra (varia um pouco, parece humano)
  whatsapp_desconto_minimo: 0, // % — 0 = manda tudo que entrou no site
  whatsapp_hora_inicio: 7, // só envia entre estas horas (horário de Brasília)
  whatsapp_hora_fim: 23,
  whatsapp_frase_ia: true, // frase engraçada da IA no campo {frase} (sem IA: frase sorteada do banco)
  whatsapp_frase_estilo: ESTILO_PADRAO,
  whatsapp_frase_palavras: 4, // a frase tem no máximo X palavras
  whatsapp_preco_minimo: 0,
  whatsapp_marca_dagua: true, // marca d'água (public/marca-dagua.png) na foto
  whatsapp_marca_posicao: "baixo", // baixo | baixo-direita | baixo-esquerda | topo | topo-direita | centro
  whatsapp_marca_tamanho: 55, // % da largura da foto
  whatsapp_marca_opacidade: 90, // % (100 = sem transparência) // R$ — só ofertas a partir desse preço (0 = qualquer preço)
  ...PADRAO_GRUPO, // prioridade / "de vez em quando" (lib/grupo-whatsapp.mjs)
  ...PADRAO_GRUPO_WHATSAPP, // compra em grupo do AliExpress (lib/compra-em-grupo-whatsapp.mjs)
};
const HORAS_PARA_TRAS = 12; // só ofertas que entraram no site nas últimas X horas

const TESTE = process.argv.includes("--teste");

function ajuste(chave) {
  const v = CONFIG_ROBO?.[chave];
  const p = PADRAO[chave];
  if (typeof p === "boolean") return typeof v === "boolean" ? v : p;
  if (typeof p === "number") return v !== undefined && v !== null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : p;
  return typeof v === "string" && v.trim() ? v : p;
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
// O rodar-robo.sh encerra o robô à força com 9 min (e ele roda a cada 10 min). Encerrado à força,
// ele não registrava a execução e o painel mostrava "Parado". Com este limite, ele para de mandar
// mensagens novas antes disso, registra a execução e o resto da fila vai na próxima rodada.
const INICIO_EXECUCAO = Date.now();
const LIMITE_EXECUCAO_MS = 7 * 60 * 1000;
const tempoRestante = () => LIMITE_EXECUCAO_MS - (Date.now() - INICIO_EXECUCAO);

// ---------- Evolution API ----------
const base = () => String(process.env.EVOLUTION_URL || "").replace(/\/+$/, "");
const instancia = () => encodeURIComponent(process.env.EVOLUTION_INSTANCIA || "mukiofertas");

export async function evolution(caminho, { metodo = "GET", corpo } = {}) {
  const r = await fetch(`${base()}${caminho}`, {
    method: metodo,
    headers: { apikey: process.env.EVOLUTION_API_KEY, "Content-Type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  const json = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = json?.response?.message ?? json?.message ?? json?.error ?? r.statusText;
    throw new Error(`Evolution ${caminho.split("?")[0]} -> ${r.status} ${JSON.stringify(msg).slice(0, 200)}`);
  }
  return json;
}

export async function estadoDaConexao() {
  const json = await evolution(`/instance/connectionState/${instancia()}`);
  return json?.instance?.state ?? json?.state ?? "desconhecido"; // "open" = conectado
}

async function enviar(grupo, texto, imagem) {
  if (imagem) {
    try {
      return await evolution(`/message/sendMedia/${instancia()}`, {
        metodo: "POST",
        corpo: { number: grupo, mediatype: "image", mimetype: "image/jpeg", media: imagem, caption: texto, fileName: "oferta.jpg" },
      });
    } catch (e) {
      // foto que a loja não deixa baixar: manda só o texto
      console.warn(`  foto falhou (${e.message}); enviando só o texto`);
    }
  }
  return evolution(`/message/sendText/${instancia()}`, {
    metodo: "POST",
    corpo: { number: grupo, text: texto, linkPreview: !imagem },
  });
}

// ---------- Pacote de cupons por loja ----------
// Capa de cada loja:
//   1) se existir public/capas-cupons/<pronta>, usa essa imagem pronta (fica mais bonita)
//   2) senão, monta: logo de public/lojas/ sobre a cor da loja (lojas sem logo: o nome escrito)
const CAPAS = {
  amazon: { logo: "amazon.png", cor: "#222222" },
  "mercado livre": { pronta: "mercado-livre.png", logo: "mercado-livre.png", cor: "#ffe600" },
  mercadolivre: { pronta: "mercado-livre.png", logo: "mercado-livre.png", cor: "#ffe600" },
  "kabum!": { logo: "kabum.png", cor: "#0060b1" },
  kabum: { logo: "kabum.png", cor: "#0060b1" },
  aliexpress: { logo: "aliexpress.png", cor: "#ff2651" },
  shopee: { pronta: "shopee.png", logo: "shopee.png", cor: "#f6412e" },
  magalu: { logo: "magalu.png", cor: "#0e89ff" },
  "magazine luiza": { logo: "magalu.png", cor: "#0e89ff" },
  netshoes: { cor: "#5c2d91" },
};
// Nome padronizado: as redes mandam "Kabum BR", "Mercadolivre", "Magazine Luiza"...
const NOMES_DE_LOJA = [
  [/kabum/i, "KaBuM!"],
  [/mercado ?livre|meli/i, "Mercado Livre"],
  [/amazon/i, "Amazon"],
  [/shopee/i, "Shopee"],
  [/aliexpress/i, "AliExpress"],
  [/magalu|magazine ?luiza/i, "Magalu"],
  [/netshoes/i, "Netshoes"],
];
function nomeDaLoja(loja) {
  const s = String(loja ?? "").trim();
  for (const [re, nome] of NOMES_DE_LOJA) if (re.test(s)) return nome;
  return s.replace(/\s+(br|brasil)$/i, "");
}
const CORES_RESERVA = ["#1e293b", "#1d4ed8", "#7c3aed", "#0f766e", "#be123c", "#c2410c"];
const escapar = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function corDoTexto(hex) {
  const n = parseInt(hex.slice(1), 16);
  const luz = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return luz > 0.6 ? "#1a1a1a" : "#ffffff";
}

async function capaDaLoja(loja) {
  const L = 800;
  const A = 420;
  const chave = nomeDaLoja(loja).toLowerCase();
  let h = 0;
  for (const ch of chave) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const capa = CAPAS[chave] ?? { cor: CORES_RESERVA[h % CORES_RESERVA.length] };
  const pronta = capa.pronta ? new URL(`../public/capas-cupons/${capa.pronta}`, import.meta.url) : null;
  if (pronta && existsSync(pronta)) {
    const img = await sharp(pronta.pathname).resize({ width: L, height: A, fit: "cover" }).jpeg({ quality: 90 }).toBuffer();
    return img.toString("base64");
  }
  const texto = corDoTexto(capa.cor);
  const camadas = [];
  const arquivo = capa.logo ? new URL(`../public/lojas/${capa.logo}`, import.meta.url) : null;
  if (arquivo && existsSync(arquivo)) {
    // as logos são pequenas: aumenta no máximo 2x (mais que isso fica borrado)
    const original = await sharp(arquivo.pathname).metadata();
    const largura = Math.min(560, (original.width ?? 200) * 2);
    const logo = await sharp(arquivo.pathname).resize({ width: largura, height: 230, fit: "inside", kernel: "lanczos3" }).png().toBuffer();
    const m = await sharp(logo).metadata();
    camadas.push({ input: logo, top: Math.round((A - 110 - m.height) / 2) + 10, left: Math.round((L - m.width) / 2) });
  } else {
    camadas.push({
      input: Buffer.from(`<svg width="${L}" height="300"><text x="50%" y="190" font-family="DejaVu Sans, Arial, sans-serif" font-size="96" font-weight="700" fill="${texto}" text-anchor="middle">${escapar(nomeDaLoja(loja))}</text></svg>`),
      top: 0,
      left: 0,
    });
  }
  camadas.push({
    input: Buffer.from(`<svg width="${L}" height="80"><text x="50%" y="55" font-family="DejaVu Sans, Arial, sans-serif" font-size="40" font-weight="700" fill="${texto}" text-anchor="middle" letter-spacing="4">CUPONS DE DESCONTO</text></svg>`),
    top: A - 95,
    left: 0,
  });
  const img = await sharp({ create: { width: L, height: A, channels: 3, background: capa.cor } })
    .composite(camadas)
    .jpeg({ quality: 88 })
    .toBuffer();
  return img.toString("base64");
}

// Escolhe a loja com mais cupons novos (que não mandou pacote há pouco) e manda uma mensagem só
async function enviarPacoteDeCupons(db, grupo, lojaOk) {
  const umaHora = new Date(Date.now() - 3600000).toISOString();
  const { data: recentes } = await db
    .from("ofertas")
    .select("loja, postada_whatsapp_em")
    .eq("categoria", "cupons")
    .gte("postada_whatsapp_em", new Date(Date.now() - ajuste("whatsapp_horas_entre_pacotes") * 3600000).toISOString());
  const pacotesNaHora = new Set((recentes ?? []).filter((r) => r.postada_whatsapp_em >= umaHora).map((r) => r.postada_whatsapp_em.slice(0, 16))).size;
  if (pacotesNaHora >= ajuste("whatsapp_pacotes_por_hora")) {
    console.log("[whatsapp] Pacote de cupons: limite por hora atingido.");
    return null;
  }
  const lojasRecentes = new Set((recentes ?? []).map((r) => nomeDaLoja(r.loja).toLowerCase()));

  const { data: cupons, error } = await db
    .from("ofertas")
    .select("id, titulo, loja, cupom, link, expires_at, publicada_em, categoria")
    .eq("categoria", "cupons")
    .eq("ativa", true)
    .is("postada_whatsapp_em", null)
    .not("cupom", "is", null)
    .gte("publicada_em", new Date(Date.now() - 7 * 86400000).toISOString())
    .order("publicada_em", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  const validos = (cupons ?? []).filter((c) => (!c.expires_at || new Date(c.expires_at) > new Date()) && lojaOk(c));

  const porLoja = new Map();
  for (const c of validos) {
    const nome = nomeDaLoja(c.loja);
    if (lojasRecentes.has(nome.toLowerCase())) continue;
    porLoja.set(nome, [...(porLoja.get(nome) ?? []), c]);
  }
  if (!porLoja.size) {
    console.log(`[whatsapp] Pacote de cupons: nenhum cupom novo (${validos.length} na fila, lojas em espera: ${[...lojasRecentes].join(", ") || "nenhuma"}).`);
    return null;
  }
  const [loja, lista] = [...porLoja.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  const escolhidos = lista.slice(0, ajuste("whatsapp_cupons_por_pacote"));

  const site = (process.env.SITE_URL || "https://www.mukiofertas.com.br").replace(/\/+$/, "");
  const linhas = escolhidos.map((c) => {
    const titulo = tituloDoCupom(c.titulo).slice(0, 90);
    return `🏷️ *${titulo}*: ${c.cupom}\n🔗 ${site}/ir/${c.id}`;
  });
  const texto = `🚨 *Cupons ${loja}*\n\n${linhas.join("\n\n")}\n\n🚀 Mais ofertas e cupons: ${site}/cupons`;

  let capa = null;
  try {
    capa = ajuste("whatsapp_com_foto") ? await capaDaLoja(loja) : null;
  } catch (e) {
    console.warn(`[whatsapp] Capa da loja falhou (${e.message}); vai só o texto.`);
  }

  if (TESTE) {
    if (capa) writeFileSync("previa-cupons.jpg", Buffer.from(capa, "base64"));
    console.log(`\n----- PACOTE DE CUPONS ${capa ? "(capa: previa-cupons.jpg) " : ""}-----\n${texto}`);
    return { enviados: 0 };
  }
  await enviar(grupo, texto, capa);
  const agora = new Date().toISOString();
  await db.from("ofertas").update({ postada_whatsapp_em: agora }).in("id", escolhidos.map((c) => c.id));
  console.log(`  ✓ Pacote de cupons ${loja}: ${escolhidos.length} cupons`);
  return { enviados: escolhidos.length };
}

// ---------- Compra em grupo (grupos de 3 do AliExpress) ----------
// Manda 1 grupo aberto por vez: primeiro os que falta 1 pessoa; "faltam 2" só se foi divulgado há
// pouco. Nunca grupo que vence em menos de 2 horas. No máximo 1 por hora e X por dia (painel).
// Extra opcional: produto da lista "Para abrir grupo" (whatsapp_grupos_abrir_por_dia).
const HORAS_FALTAM_2_RECENTE = 4;
const MIN_HORAS_ATE_VENCER = 2;

async function enviarCompraEmGrupo(db, grupoWhats) {
  if (!ajuste("whatsapp_grupos_ativo") && !ajuste("whatsapp_grupos_abrir_por_dia")) return null;
  const agora = Date.now();
  const TRES_HORAS = 3 * 3600000; // meia-noite de Brasília (UTC-3)
  const meiaNoite = new Date(Math.floor((agora - TRES_HORAS) / 86400000) * 86400000 + TRES_HORAS).toISOString();
  const umaHora = new Date(agora - 3600000).toISOString();

  const [{ data: enviadosHoje, error: erroGrupos }, { data: abrirHoje }] = await Promise.all([
    db.from("grupos_compra").select("postada_whatsapp_em").gte("postada_whatsapp_em", meiaNoite).limit(100),
    db.from("grupos_produtos").select("abrir_whatsapp_em").gte("abrir_whatsapp_em", meiaNoite).limit(100),
  ]);
  if (erroGrupos) {
    console.log("[whatsapp] Compra em grupo: rode o supabase/compra-em-grupo.sql (parte 4) para ligar o envio.");
    return null;
  }
  const todosHoje = [...(enviadosHoje ?? []).map((g) => g.postada_whatsapp_em), ...(abrirHoje ?? []).map((p) => p.abrir_whatsapp_em)];
  if (todosHoje.some((t) => t >= umaHora)) {
    console.log("[whatsapp] Compra em grupo: já foi um na última hora.");
    return null;
  }
  const siteUrl = process.env.SITE_URL || "https://www.mukiofertas.com.br";
  let produto = null;
  let grupoAberto = null;

  // 1) Grupo aberto
  if (ajuste("whatsapp_grupos_ativo") && (enviadosHoje?.length ?? 0) < ajuste("whatsapp_grupos_por_dia")) {
    const { data: grupos } = await db
      .from("grupos_compra")
      .select("id, produto_id, link, faltam, criado_em, expira_em")
      .eq("status", "aberto")
      .gt("faltam", 0)
      .is("postada_whatsapp_em", null)
      .gt("expira_em", new Date(agora + MIN_HORAS_ATE_VENCER * 3600000).toISOString())
      .order("faltam", { ascending: true })
      .order("criado_em", { ascending: false })
      .limit(30);
    const recente = new Date(agora - HORAS_FALTAM_2_RECENTE * 3600000).toISOString();
    grupoAberto =
      (grupos ?? []).find((g) => g.faltam === 1 || (!ajuste("whatsapp_grupos_so_falta1") && g.criado_em >= recente)) ?? null;
    if (grupoAberto) {
      const { data } = await db.from("grupos_produtos").select("*").eq("id", grupoAberto.produto_id).maybeSingle();
      produto = data;
    }
  }

  // 2) Extra: produto para abrir grupo (só quando não tem grupo aberto para mandar)
  if (!produto && (abrirHoje?.length ?? 0) < ajuste("whatsapp_grupos_abrir_por_dia")) {
    const { data: lista } = await db
      .from("grupos_produtos")
      .select("*")
      .is("abrir_whatsapp_em", null)
      .not("preco_grupo", "is", null)
      .order("grupos_criados", { ascending: false })
      .order("atualizado_em", { ascending: false })
      .limit(20);
    produto = (lista ?? [])[0] ?? null;
  }
  if (!produto) {
    console.log("[whatsapp] Compra em grupo: nenhum grupo para mandar agora.");
    return null;
  }

  const modelo = grupoAberto ? ajuste("whatsapp_modelo_grupo") : ajuste("whatsapp_modelo_abrir");
  const texto = montarMensagem(modelo, camposDoGrupo(produto, grupoAberto, { siteUrl }));
  let foto = ajuste("whatsapp_com_foto") ? produto.imagem : null;
  if (foto && ajuste("whatsapp_marca_dagua")) {
    const comMarca = await fotoComMarcaDagua(foto, {
      posicao: ajuste("whatsapp_marca_posicao"),
      tamanho: ajuste("whatsapp_marca_tamanho"),
      opacidade: ajuste("whatsapp_marca_opacidade"),
    }).catch(() => null);
    if (comMarca) foto = comMarca;
  }
  if (TESTE) {
    if (foto && !foto.startsWith("http")) writeFileSync("previa-compra-em-grupo.jpg", Buffer.from(foto, "base64"));
    console.log(`\n----- COMPRA EM GRUPO ${grupoAberto ? "(grupo aberto)" : "(abra um grupo)"} -----\n${texto}`);
    return { enviados: 0 };
  }
  await enviar(grupoWhats, texto, foto);
  const quando = new Date().toISOString();
  if (grupoAberto) await db.from("grupos_compra").update({ postada_whatsapp_em: quando }).eq("id", grupoAberto.id);
  else await db.from("grupos_produtos").update({ abrir_whatsapp_em: quando }).eq("id", produto.id);
  console.log(`  ✓ Compra em grupo: ${produto.titulo.slice(0, 60)}`);
  return { enviados: 1 };
}

// ---------- Robô ----------
function horaDeBrasilia() {
  return Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()));
}

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  await aplicarConfigDoBanco(db);

  if (!ajuste("whatsapp_ativo") && !TESTE) {
    console.log("[whatsapp] Desligado no painel admin (Configurações → WhatsApp): nada a fazer.");
    await registrarExecucao(db, "postar-whatsapp", true, "Desligado no painel (Configurações → WhatsApp)");
    return;
  }
  const grupo = ajuste("whatsapp_grupo").trim();
  if (!grupo && !TESTE) throw new Error("Falta o id do grupo em Configurações → WhatsApp (rode o testar-whatsapp.mjs para ver os seus grupos).");
  if (!base() || !process.env.EVOLUTION_API_KEY) throw new Error("Faltam EVOLUTION_URL ou EVOLUTION_API_KEY.");

  const hora = horaDeBrasilia();
  const inicio = ajuste("whatsapp_hora_inicio");
  const fim = ajuste("whatsapp_hora_fim");
  if (!TESTE && (hora < inicio || hora >= fim)) {
    console.log(`[whatsapp] Fora do horário de envio (${inicio}h às ${fim}h). Agora são ${hora}h.`);
    await registrarExecucao(db, "postar-whatsapp", true, `Fora do horário de envio (${inicio}h às ${fim}h)`);
    return;
  }

  if (!TESTE) {
    const estado = await estadoDaConexao();
    if (estado !== "open") throw new Error(`O WhatsApp não está conectado (estado: ${estado}). Abra o painel da Evolution e leia o QR Code de novo.`);
  }

  // Limite por hora
  const umaHora = new Date(Date.now() - 3600000).toISOString();
  const { count: naUltimaHora } = await db
    .from("ofertas")
    .select("id", { count: "exact", head: true })
    .neq("categoria", "cupons")
    .gte("postada_whatsapp_em", umaHora);
  const vagas = Math.min(ajuste("whatsapp_max_por_execucao"), ajuste("whatsapp_max_por_hora") - (naUltimaHora ?? 0));
  if (vagas <= 0) {
    console.log(`[whatsapp] Limite de ${ajuste("whatsapp_max_por_hora")} mensagens por hora atingido.`);
    await registrarExecucao(db, "postar-whatsapp", true, `Limite de ${ajuste("whatsapp_max_por_hora")} mensagens por hora atingido`);
    return;
  }

  // Ofertas novas ainda não enviadas
  const desde = new Date(Date.now() - HORAS_PARA_TRAS * 3600000).toISOString();
  const { data, error } = await db
    .from("ofertas")
    .select("id, titulo, loja, categoria, preco_atual, preco_antigo, cupom, link, imagem, destaque, publicada_em, expires_at, ativa, origem, cliques, likes, dislikes")
    .eq("ativa", true)
    .is("postada_whatsapp_em", null)
    .gte("publicada_em", desde)
    .or("origem.is.null,origem.neq.comunidade")
    .order("publicada_em", { ascending: false })
    .limit(200);
  if (error) throw new Error(`${error.message} (rodou o whatsapp.sql no Supabase?)`);

  const descontoDe = (o) =>
    Number(o.preco_antigo) > Number(o.preco_atual) ? ((o.preco_antigo - o.preco_atual) / o.preco_antigo) * 100 : 0;
  // Tipos de produto e lojas escolhidos no painel (lista vazia = todos)
  const lista = (chave) => (Array.isArray(CONFIG_ROBO?.[chave]) ? CONFIG_ROBO[chave] : []);
  // Níveis do painel: prioridade / "de vez em quando" (os dois também contam como "escolhidos")
  const niveis = niveisDoGrupo(CONFIG_ROBO);
  const categoriasEscolhidas = new Set(lista("whatsapp_categorias"));
  if (categoriasEscolhidas.size) for (const c of [...niveis.prioridade, ...niveis.ocasional]) categoriasEscolhidas.add(c);
  const lojasEscolhidas = new Set(lista("whatsapp_lojas_nomes").map((n) => String(n).toLowerCase()));
  const tipoOk = (o) => o.categoria === "cupons" || !categoriasEscolhidas.size || categoriasEscolhidas.has(o.categoria);
  const lojaOk = (o) => !lojasEscolhidas.size || lojasEscolhidas.has(String(o.loja).toLowerCase());
  const precoOk = (o) => o.categoria === "cupons" || Number(o.preco_atual) >= ajuste("whatsapp_preco_minimo");

  // Filtros, um de cada vez, contando quantas ficaram de fora em cada um (aparece no log)
  const foraPor = {};
  const filtrar = (lista, nome, teste) =>
    lista.filter((o) => {
      const ok = teste(o);
      if (!ok) foraPor[nome] = (foraPor[nome] ?? 0) + 1;
      return ok;
    });
  let aprovadas = data ?? [];
  aprovadas = filtrar(aprovadas, "tipo de produto", tipoOk);
  aprovadas = filtrar(aprovadas, "loja", lojaOk);
  aprovadas = filtrar(aprovadas, "preço mínimo", precoOk);
  aprovadas = filtrar(aprovadas, "expirada", (o) => !o.expires_at || new Date(o.expires_at) > new Date());
  aprovadas = filtrar(aprovadas, "cupom", (o) => (o.categoria === "cupons" ? ajuste("whatsapp_enviar_cupons") && o.cupom : true));
  aprovadas = filtrar(aprovadas, "desconto mínimo", (o) => o.categoria === "cupons" || descontoDe(o) >= ajuste("whatsapp_desconto_minimo"));
  if (Object.keys(foraPor).length)
    console.log(`[whatsapp] Ficaram de fora: ${Object.entries(foraPor).map(([k, n]) => `${n} por ${k}`).join(", ")}.`);
  // Cupons têm vaga reservada: até X por hora, 1 por execução, os mais novos primeiro.
  // (Antes eles disputavam pelo maior desconto, ficavam com 0% e nunca eram enviados.)
  const { count: cuponsNaHora } = await db
    .from("ofertas")
    .select("id", { count: "exact", head: true })
    .eq("categoria", "cupons")
    .gte("postada_whatsapp_em", umaHora);
  const vagasCupom = ajuste("whatsapp_cupons_agrupados") ? 0 : Math.min(1, vagas, Math.max(0, ajuste("whatsapp_cupons_por_hora") - (cuponsNaHora ?? 0)));
  const cuponsDaVez = aprovadas
    .filter((o) => o.categoria === "cupons")
    .sort((a, b) => new Date(b.publicada_em ?? 0) - new Date(a.publicada_em ?? 0))
    .slice(0, vagasCupom);
  // Ordem das ofertas: pontos (lib/grupo-whatsapp.mjs), não só o maior desconto.
  // Antes era só o desconto, e roupa/sapato com preço "de" inflado (70-80% OFF) passava na frente
  // de eletrodoméstico e TV.
  // meia-noite de hoje no horário de Brasília (UTC-3, sem horário de verão)
  const TRES_HORAS = 3 * 3600000;
  const desdeMeiaNoite = new Date(Math.floor((Date.now() - TRES_HORAS) / 86400000) * 86400000 + TRES_HORAS).toISOString();
  const [{ data: enviadasHoje }, { data: cliques30 }] = await Promise.all([
    db.from("ofertas").select("titulo, categoria").neq("categoria", "cupons").gte("postada_whatsapp_em", desdeMeiaNoite).limit(500),
    db
      .from("ofertas")
      .select("categoria, cliques")
      .gt("cliques", 0)
      .gte("publicada_em", new Date(Date.now() - 30 * 86400000).toISOString())
      .limit(5000),
  ]);
  const ocasionaisHoje = (enviadasHoje ?? []).filter((o) => nivelDaOferta(o, niveis) === "ocasional").length;
  let vagasOcasional = Math.max(0, Math.min(1, ajuste("whatsapp_ocasional_por_dia") - ocasionaisHoje));
  const bonusCliques = bonusPorCliques(cliques30 ?? []);
  const maxMesmaCategoria = Math.max(1, ajuste("whatsapp_max_mesma_categoria"));

  const pontuadas = aprovadas
    .filter((o) => o.categoria !== "cupons")
    .map((o) => ({ o, ...pontuarParaGrupo(o, { config: CONFIG_ROBO, niveis, bonusCliques }) }))
    // destaques primeiro, depois os pontos
    .sort((a, b) => Number(b.o.destaque) - Number(a.o.destaque) || b.pontos - a.pontos);
  const ofertasDaVez = [];
  const porCategoria = new Map();
  for (const { o, nivel } of pontuadas) {
    if (ofertasDaVez.length >= vagas - cuponsDaVez.length) break;
    if (nivel === "ocasional") {
      if (vagasOcasional <= 0) continue;
      vagasOcasional--;
    }
    const n = porCategoria.get(o.categoria) ?? 0;
    if (n >= maxMesmaCategoria) continue;
    porCategoria.set(o.categoria, n + 1);
    ofertasDaVez.push(o);
  }
  const contagemNiveis = pontuadas.reduce((m, x) => ((m[x.nivel] = (m[x.nivel] ?? 0) + 1), m), {});
  console.log(
    `[whatsapp] Na fila: ${contagemNiveis.prioridade ?? 0} de prioridade, ${contagemNiveis.normal ?? 0} normais, ` +
      `${contagemNiveis.ocasional ?? 0} "de vez em quando" (${ocasionaisHoje}/${ajuste("whatsapp_ocasional_por_dia")} já enviados hoje).`
  );
  if (TESTE)
    for (const x of pontuadas.slice(0, 15))
      console.log(`   ${x.pontos.toFixed(1).padStart(6)}  [${x.nivel}] ${x.o.titulo.slice(0, 70)}`);
  // Se não tem oferta para enviar, a vaga sobrando também pode ir para cupons
  const sobra = vagas - cuponsDaVez.length - ofertasDaVez.length;
  const maisCupons = sobra > 0 && vagasCupom > 0
    ? aprovadas.filter((o) => o.categoria === "cupons" && !cuponsDaVez.includes(o)).slice(0, Math.min(sobra, Math.max(0, ajuste("whatsapp_cupons_por_hora") - (cuponsNaHora ?? 0) - cuponsDaVez.length)))
    : [];
  const candidatas = [...ofertasDaVez, ...cuponsDaVez, ...maisCupons];
  const cuponsNaFila = aprovadas.filter((o) => o.categoria === "cupons").length;
  if (cuponsNaFila && !ajuste("whatsapp_cupons_agrupados")) console.log(`[whatsapp] Cupons na fila: ${cuponsNaFila}; vão agora: ${cuponsDaVez.length + maisCupons.length} (${cuponsNaHora ?? 0} já enviados na última hora).`);

  console.log(
    `[whatsapp] ${data?.length ?? 0} ofertas novas sem envio` +
      (categoriasEscolhidas.size || lojasEscolhidas.size ? " (com o filtro de tipos/lojas do painel)" : "") +
      `; ${candidatas.length} vão para o grupo agora.`
  );

  // Frases enviadas nas últimas mensagens, para a IA (e o banco de frases) não repetir
  const { data: ultimas, error: erroFrases } = await db
    .from("ofertas")
    .select("frase_whatsapp")
    .not("frase_whatsapp", "is", null)
    .order("postada_whatsapp_em", { ascending: false })
    .limit(40);
  if (erroFrases) console.warn("[whatsapp] Rode o whatsapp-frases.sql no Supabase para o robô lembrar das frases já usadas.");
  // junta as do banco com as do arquivo local (sem repetir), mais novas primeiro
  const recentes = [
    ...new Set([...(ultimas ?? []).map((u) => u.frase_whatsapp), ...lerFrasesLocais()].filter(Boolean)),
  ].slice(0, 60);
  console.log(`[whatsapp] ${recentes.length} frases recentes na memória (para não repetir).`);
  const contagemFrases = { ia: 0, banco: 0, motivos: new Set() };

  let enviadas = 0;
  const falhas = [];
  let ficaramParaDepois = 0;
  for (const [i, o] of candidatas.entries()) {
    // sem tempo para mais uma mensagem (frase + foto + envio): o resto vai na próxima rodada
    if (!TESTE && tempoRestante() < 60 * 1000) {
      ficaramParaDepois = candidatas.length - i;
      console.log(`[whatsapp] Tempo da rodada acabando: ${ficaramParaDepois} ficam para a próxima.`);
      break;
    }
    const siteUrl = process.env.SITE_URL || "https://www.mukiofertas.com.br";
    let campos = camposDaOferta(o, { siteUrl });
    let fraseUsada = null;
    const modelo = o.categoria === "cupons" ? ajuste("whatsapp_modelo_cupom") : ajuste("whatsapp_modelo");
    // Frase engraçada: só é gerada se o modelo tiver o campo {frase}
    if (modelo.includes("{frase}")) {
      const { frase, origem, motivo } = await gerarFrase(o, campos, {
        estilo: ajuste("whatsapp_frase_estilo"),
        usarIa: ajuste("whatsapp_frase_ia"),
        recentes,
        maxPalavras: ajuste("whatsapp_frase_palavras"),
        prazoMs: Math.max(5000, Math.min(40000, tempoRestante() - 45000)),
      });
      campos = { ...campos, frase };
      fraseUsada = frase;
      recentes.unshift(frase); // as próximas mensagens desta execução também não repetem
      contagemFrases[origem]++;
      if (motivo) contagemFrases.motivos.add(motivo);
      if (TESTE) console.log(`  (frase ${origem === "ia" ? "da IA" : `do banco: ${motivo}`})`);
    }
    const texto = montarMensagem(modelo, campos);
    let foto = ajuste("whatsapp_com_foto") ? o.imagem : null;
    // marca d'água: a foto vai em base64 já com a marca (se falhar, vai a foto original)
    if (foto && ajuste("whatsapp_marca_dagua")) {
      const comMarca = await fotoComMarcaDagua(foto, {
        posicao: ajuste("whatsapp_marca_posicao"),
        tamanho: ajuste("whatsapp_marca_tamanho"),
        opacidade: ajuste("whatsapp_marca_opacidade"),
      });
      if (comMarca) {
        foto = comMarca;
        // no teste, salva a foto para você ver como ficou
        if (TESTE) writeFileSync(`previa-whatsapp-${i + 1}.jpg`, Buffer.from(comMarca, "base64"));
      }
    }

    if (TESTE) {
      console.log(
        `\n----- ${i + 1}. ${foto ? (foto.startsWith("http") ? "(com foto) " : `(foto com marca d'água: previa-whatsapp-${i + 1}.jpg) `) : ""}-----\n${texto}`
      );
      continue;
    }
    try {
      await enviar(grupo, texto, foto);
      const marca = { postada_whatsapp_em: new Date().toISOString(), frase_whatsapp: fraseUsada };
      const { error: erroMarca } = await db.from("ofertas").update(marca).eq("id", o.id);
      // sem a coluna frase_whatsapp (whatsapp-frases.sql não rodado): marca só como enviada
      if (erroMarca) await db.from("ofertas").update({ postada_whatsapp_em: marca.postada_whatsapp_em }).eq("id", o.id);
      enviadas++;
      if (fraseUsada) salvarFrasesLocais(recentes);
      console.log(`  ✓ ${o.titulo.slice(0, 70)}`);
    } catch (e) {
      falhas.push(e.message);
      console.warn(`  ✗ ${o.titulo.slice(0, 70)}: ${e.message}`);
    }
    // intervalo entre as mensagens, variando ±30% para não parecer robô
    if (i < candidatas.length - 1) {
      const s = ajuste("whatsapp_intervalo_segundos");
      const pausa = Math.round(s * (0.7 + Math.random() * 0.6) * 1000);
      // se a pausa comeria o tempo da próxima mensagem, encerra a rodada aqui
      if (!TESTE && tempoRestante() - pausa < 60 * 1000) {
        ficaramParaDepois = candidatas.length - i - 1;
        console.log(`[whatsapp] Tempo da rodada acabando: ${ficaramParaDepois} ficam para a próxima.`);
        break;
      }
      await esperar(pausa);
    }
  }

  // Pacote de cupons por loja (capa + lista), no estilo dos grupos de ofertas
  if (ajuste("whatsapp_cupons_agrupados") && ajuste("whatsapp_enviar_cupons")) {
    try {
      const r = await enviarPacoteDeCupons(db, grupo, lojaOk);
      if (r?.enviados) enviadas += 1;
    } catch (e) {
      falhas.push(`pacote de cupons: ${e.message}`);
      console.warn(`[whatsapp] Pacote de cupons falhou: ${e.message}`);
    }
  }

  // Compra em grupo (grupos de 3 do AliExpress): 1 por vez, com limite próprio por hora e por dia
  if (TESTE || tempoRestante() > 90 * 1000) {
    try {
      // depois de outras mensagens desta rodada, espera o intervalo normal antes
      if (enviadas > 0 && !TESTE) await esperar(Math.round(ajuste("whatsapp_intervalo_segundos") * 1000));
      const r = await enviarCompraEmGrupo(db, grupo);
      if (r?.enviados) enviadas += 1;
    } catch (e) {
      falhas.push(`compra em grupo: ${e.message}`);
      console.warn(`[whatsapp] Compra em grupo falhou: ${e.message}`);
    }
  }

  if (TESTE) {
    console.log("\n(teste: nada foi enviado)\n");
    return;
  }
  if (contagemFrases.ia || contagemFrases.banco)
    console.log(
      `[whatsapp] Frases: ${contagemFrases.ia} da IA, ${contagemFrases.banco} do banco` +
        (contagemFrases.motivos.size ? ` (motivo: ${[...contagemFrases.motivos].join("; ")})` : "")
    );
  const resumo =
    `${enviadas} enviadas para o grupo` +
    (ficaramParaDepois ? ` · ${ficaramParaDepois} ficaram para a próxima rodada` : "") +
    (falhas.length ? ` | ${falhas.length} falharam: ${falhas[0]}` : "");
  console.log(`[whatsapp] ${resumo}`);
  await registrarExecucao(db, "postar-whatsapp", falhas.length === 0 || enviadas > 0, resumo);
}

// Roda só quando chamado direto (o testar-whatsapp.mjs importa as funções acima)
if (process.argv[1]?.endsWith("postar-whatsapp.mjs")) {
  main().catch(async (erro) => {
    console.error("[whatsapp] Erro:", erro.message);
    try {
      const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      await registrarExecucao(db, "postar-whatsapp", false, `Erro: ${erro.message}`);
    } catch {}
    process.exit(1);
  });
}
