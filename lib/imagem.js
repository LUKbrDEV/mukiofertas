import { createClient } from "@supabase/supabase-js";

function supabaseServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Baixa a foto da mensagem do Telegram e guarda no Supabase Storage
export async function imagemDoTelegram(fotos) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || !Array.isArray(fotos) || fotos.length === 0) return null;

    const maior = fotos[fotos.length - 1];
    const info = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${maior.file_id}`
    ).then((r) => r.json());
    const caminho = info?.result?.file_path;
    if (!caminho) return null;

    const resp = await fetch(`https://api.telegram.org/file/bot${token}/${caminho}`);
    if (!resp.ok) return null;
    const buffer = Buffer.from(await resp.arrayBuffer());

    const nome = `tg-${maior.file_unique_id}.jpg`;
    const supabase = supabaseServidor();
    const { error } = await supabase.storage
      .from("ofertas")
      .upload(nome, buffer, { contentType: "image/jpeg", upsert: true });
    if (error) {
      console.error("Erro ao enviar imagem:", error);
      return null;
    }
    return supabase.storage.from("ofertas").getPublicUrl(nome).data.publicUrl;
  } catch (e) {
    console.error("Erro imagem Telegram:", e);
    return null;
  }
}

// A busca da foto pelo link do produto fica em lib/foto-produto.mjs
// (assim os scripts da VPS também conseguem usar)
export { imagemDoLink, imagemAmazon } from "./foto-produto.mjs";
