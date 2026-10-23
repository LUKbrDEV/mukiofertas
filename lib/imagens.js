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

// Tenta pegar a imagem principal da página do produto (og:image)
export async function imagemDoLink(link) {
  try {
    const resp = await fetch(link, {
      redirect: "follow",
      signal: AbortSignal.timeout(4000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });
    if (!resp.ok) return null;
    const html = (await resp.text()).slice(0, 300000);
    const m =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return m && m[1].startsWith("http") ? m[1] : null;
  } catch {
    return null;
  }
}