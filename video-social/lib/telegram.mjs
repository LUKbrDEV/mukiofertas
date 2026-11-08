// Manda o vídeo pronto (com o texto do post) para o SEU chat no Telegram, pelo bot do MukiOfertas.
// Use um chat pessoal ou um grupo só da equipe — NÃO o canal de ofertas.
//   VIDEO_TELEGRAM_CHAT_ID   id do seu chat com o bot (ex.: 123456789)
import fs from "node:fs";
import path from "node:path";
import { pegar } from "./env.mjs";

export async function enviarVideoTelegram({ arquivo, legenda }) {
  const token = pegar("TELEGRAM_BOT_TOKEN");
  const chat = pegar("VIDEO_TELEGRAM_CHAT_ID");
  if (!token || !chat) {
    console.log("    (sem VIDEO_TELEGRAM_CHAT_ID: o vídeo ficou só na pasta saida)");
    return false;
  }
  const form = new FormData();
  form.append("chat_id", chat);
  form.append("caption", legenda.slice(0, 1024));
  form.append("supports_streaming", "true");
  form.append("width", "1080");
  form.append("height", "1920");
  form.append("video", new Blob([fs.readFileSync(arquivo)], { type: "video/mp4" }), path.basename(arquivo));
  const r = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, { method: "POST", body: form });
  const json = await r.json().catch(() => ({}));
  if (!json.ok) throw new Error(`Telegram: ${json.description ?? r.status}`);
  return true;
}
