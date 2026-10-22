import { createClient } from "@supabase/supabase-js";
import { interpretarMensagem } from "./telegram-parser.mjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
// Canal de onde as ofertas são lidas. Se não definir TELEGRAM_FONTE, usa o mesmo canal do TELEGRAM_CHAT_ID.
const FONTE = (process.env.TELEGRAM_FONTE ?? process.env.TELEGRAM_CHAT_ID ?? "").trim();

const VALIDADE_HORAS = 48; // depois disso a oferta importada sai do site (você pode ocultar antes no painel)
const BUCKET = "imagens";

if (!TOKEN || !FONTE) {
  console.error("Faltam TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID (ou TELEGRAM_FONTE).");
  process.exit(1);
}

async function telegram(metodo, parametros = {}) {
  const resposta = await fetch(`https://api.telegram.org/bot${TOKEN}/${metodo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parametros),
  });
  const dados = await resposta.json();
  if (!dados.ok) throw new Error(`${metodo}: ${dados.description}`);
  return dados.result;
}

function ehDaFonte(chat) {
  if (!chat) return false;
  if (FONTE.startsWith("@")) return `@${chat.username ?? ""}`.toLowerCase() === FONTE.toLowerCase();
  return String(chat.id) === FONTE;
}

// Copia a foto do Telegram para o Supabase (o endereço original do Telegram contém o token do bot)
async function copiarFoto(fileId, nome) {
  const info = await telegram("getFile", { file_id: fileId });
  const resposta = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${info.file_path}`);
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} ao baixar a foto`);
  const arquivo = Buffer.from(await resposta.arrayBuffer());

  const caminho = `telegram/${nome}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, arquivo, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);

  return supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
}

async function main() {
  const { data: estado } = await supabase
    .from("telegram_estado")
    .select("ultimo_update")
    .eq("id", 1)
    .maybeSingle();
  let ultimo = estado?.ultimo_update ?? 0;

  // 1) Lê as mensagens novas
  const mensagens = new Map(); // se a mesma mensagem foi editada, vale a última versão
  const chatsVistos = new Set();
  let lidas = 0;

  while (true) {
    const atualizacoes = await telegram("getUpdates", {
      offset: ultimo + 1,
      limit: 100,
      timeout: 0,
      allowed_updates: ["channel_post", "edited_channel_post", "message", "edited_message"],
    });
    if (atualizacoes.length === 0) break;

    for (const u of atualizacoes) {
      ultimo = Math.max(ultimo, u.update_id);
      lidas++;
      const msg = u.channel_post ?? u.edited_channel_post ?? u.message ?? u.edited_message;
      if (!msg) continue;
      if (!ehDaFonte(msg.chat)) {
        chatsVistos.add(msg.chat.username ? `@${msg.chat.username}` : String(msg.chat.id));
        continue;
      }
      mensagens.set(`${msg.chat.id}-${msg.message_id}`, msg);
    }
    if (atualizacoes.length < 100) break;
  }

  // 2) Transforma em ofertas
  const ofertas = [];
  const ignoradas = {};
  for (const msg of mensagens.values()) {
    const r = interpretarMensagem(msg);
    if (!r.oferta) {
      ignoradas[r.motivo] = (ignoradas[r.motivo] ?? 0) + 1;
      continue;
    }

    const oferta = {
      ...r.oferta,
      origem: "telegram",
      ativa: true,
      relampago: false,
      postada_telegram_em: new Date().toISOString(), // já está no canal, o robô não reposta
      atualizado_em: new Date((msg.edit_date ?? msg.date) * 1000).toISOString(),
    };

    if (r.fotoId) {
      try {
        oferta.imagem = await copiarFoto(r.fotoId, `${msg.chat.id}-${msg.message_id}`.replace("-", "n"));
      } catch (erro) {
        console.error(`Foto não copiada (${oferta.titulo.slice(0, 30)}...):`, erro.message);
      }
    }
    ofertas.push(oferta);
  }

  // 3) Respeita o que você ocultou no painel
  let paraGravar = ofertas;
  if (ofertas.length > 0) {
    const { data: ocultas } = await supabase
      .from("ofertas")
      .select("id_externo")
      .eq("oculta_manual", true)
      .in("id_externo", ofertas.map((o) => o.id_externo));
    const bloqueadas = new Set((ocultas ?? []).map((o) => o.id_externo));
    paraGravar = ofertas.filter((o) => !bloqueadas.has(o.id_externo));
  }

  if (paraGravar.length > 0) {
    const { error } = await supabase
      .from("ofertas")
      .upsert(paraGravar, { onConflict: "loja,id_externo" });
    if (error) {
      console.error("Erro ao gravar as ofertas (o offset não foi salvo, tentará de novo):", error.message);
      process.exit(1);
    }
  }

  // 4) Só agora guarda até onde leu
  if (ultimo > (estado?.ultimo_update ?? 0)) {
    await supabase.from("telegram_estado").upsert({ id: 1, ultimo_update: ultimo });
  }

  // 5) Tira do site as ofertas importadas que passaram da validade
  const limite = new Date(Date.now() - VALIDADE_HORAS * 3600 * 1000).toISOString();
  await supabase
    .from("ofertas")
    .update({ ativa: false })
    .eq("origem", "telegram")
    .lt("atualizado_em", limite);

  console.log(
    `Telegram: ${lidas} atualizações lidas, ${mensagens.size} do canal, ${paraGravar.length} ofertas importadas.`
  );
  if (Object.keys(ignoradas).length > 0) console.log("Mensagens ignoradas:", JSON.stringify(ignoradas));
  if (lidas > 0 && mensagens.size === 0) {
    console.log(`Nenhuma mensagem do canal ${FONTE}. Chats vistos: ${[...chatsVistos].join(", ") || "nenhum"}.`);
  }
}

main().catch((erro) => {
  console.error("Falha na importação:", erro.message);
  process.exit(1);
});
