// Posta o vídeo pronto sozinho no Instagram (Reels) e no YouTube (Shorts), com a chamada
// para o Grupo VIP do WhatsApp. Cada rede é independente: se uma falhar (ou estiver sem
// chave), as outras continuam.
//
// Quais redes postam: variável PUBLICAR_REDES (ex.: PUBLICAR_REDES=instagram,youtube).
// Vazia = não posta em nenhuma (o vídeo continua indo só para o seu Telegram).
//
// Instagram (Reels) — conta profissional (Comercial ou Criador de conteúdo) do Instagram:
//   IG_USER_ID         id da conta do Instagram na API
//   IG_ACCESS_TOKEN    token com permissão de publicar
//   IG_GRAPH_HOST      graph.instagram.com (login do Instagram, padrão) ou graph.facebook.com (login do Facebook)
//   IG_API_VERSION     opcional (padrão v25.0)
//
// YouTube (Shorts):
//   YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN
//   (o refresh token sai do video-social/autorizar-youtube.mjs, rodado uma vez no PC)
//
// Link do grupo usado nas descrições: GRUPO_VIP_URL (padrão https://www.mukiofertas.com.br/whatsapp)
import fs from "node:fs";
import path from "node:path";
import { pegar } from "./env.mjs";

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export function redesAtivas() {
  return pegar("PUBLICAR_REDES")
    .toLowerCase()
    .split(/[\s,;]+/)
    .filter(Boolean);
}

export const linkGrupo = () => pegar("GRUPO_VIP_URL") || "https://www.mukiofertas.com.br/whatsapp";

// Tira hashtags do fim do texto do roteiro, para reorganizar com a chamada do grupo no meio
function separarHashtags(texto = "") {
  const tags = texto.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  const corpo = texto.replace(/#[\p{L}\p{N}_]+/gu, "").replace(/\s+/g, " ").trim();
  return { corpo, tags: [...new Set(tags.map((t) => t.toLowerCase()))] };
}

// Instagram: link na legenda não é clicável, então a chamada manda para a bio
export function legendaInstagram(textoPost) {
  const { corpo, tags } = separarHashtags(textoPost);
  const hashtags = [...new Set([...tags, "#mukiofertas", "#promocao", "#achadinhos"])].slice(0, 8).join(" ");
  return [
    corpo.replace(/link na bio[.!]?/i, "").trim(),
    "",
    "🟢 Entre no Grupo VIP do WhatsApp, é grátis! Link na bio 👆",
    "",
    hashtags,
  ].join("\n").slice(0, 2200);
}

// YouTube: o link na descrição é clicável
export function textosYouTube(textoPost) {
  const { corpo, tags } = separarHashtags(textoPost);
  const frase = corpo.replace(/link na bio[.!]?/i, "").trim();
  let titulo = frase.split(/(?<=[.!?])\s/)[0] || "Ofertas do dia no MukiOfertas";
  titulo = titulo.replace(/[<>]/g, "");
  if (titulo.length > 88) titulo = titulo.slice(0, 88).replace(/\s+\S*$/, "") + "…";
  titulo += " #shorts";
  const descricao = [
    frase,
    "",
    `🟢 Grupo VIP de ofertas no WhatsApp (grátis): ${linkGrupo()}`,
    "🛒 Todas as ofertas: https://www.mukiofertas.com.br",
    "",
    [...new Set([...tags, "#shorts", "#mukiofertas", "#promocao"])].slice(0, 10).join(" "),
  ].join("\n").replace(/[<>]/g, "").slice(0, 4900);
  const etiquetas = [...new Set(["mukiofertas", "promoção", "ofertas", "achadinhos", "cupom de desconto", ...tags.map((t) => t.slice(1))])].slice(0, 15);
  return { titulo, descricao, etiquetas };
}

// ---------------------------------------------------------------- Instagram
// O token do login do Instagram vale 60 dias e pode ser renovado. O robô renova sozinho
// uma vez por semana e guarda o novo em saida/.token-instagram.json.
function arquivoToken(pastaSaida) {
  return path.join(pastaSaida, ".token-instagram.json");
}
async function tokenInstagram(pastaSaida, host) {
  let salvo = {};
  try { salvo = JSON.parse(fs.readFileSync(arquivoToken(pastaSaida), "utf8")); } catch {}
  const doEnv = pegar("IG_ACCESS_TOKEN");
  // se o token do .env mudou (você colou um novo), ele vale mais que o salvo
  let token = salvo.origem === doEnv && salvo.token ? salvo.token : doEnv;
  const renovadoEm = salvo.origem === doEnv ? salvo.renovadoEm ?? 0 : 0;
  if (host === "graph.instagram.com" && Date.now() - renovadoEm > 7 * 86400000) {
    try {
      const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
      const j = await r.json();
      if (j.access_token) {
        token = j.access_token;
        fs.writeFileSync(arquivoToken(pastaSaida), JSON.stringify({ origem: doEnv, token, renovadoEm: Date.now() }));
        console.log("    instagram: token renovado");
      } else if (j.error) {
        console.log(`    instagram: não renovei o token (${j.error.message})`);
      }
    } catch (e) {
      console.log(`    instagram: não renovei o token (${e.message})`);
    }
  }
  return token;
}

async function igApi(host, versao, caminho, { metodo = "GET", token, corpo } = {}) {
  const url = `https://${host}/${versao}/${caminho}`;
  const r = await fetch(url, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, ...(corpo ? { "Content-Type": "application/json" } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`Instagram ${r.status}: ${j.error?.message ?? JSON.stringify(j).slice(0, 200)}`);
  return j;
}

export async function publicarInstagram({ arquivo, legenda, pastaSaida }) {
  const igId = pegar("IG_USER_ID");
  if (!igId || !pegar("IG_ACCESS_TOKEN")) throw new Error("faltam IG_USER_ID / IG_ACCESS_TOKEN");
  const host = pegar("IG_GRAPH_HOST") || "graph.instagram.com";
  const versao = pegar("IG_API_VERSION") || "v25.0";
  const token = await tokenInstagram(pastaSaida, host);
  const bytes = fs.readFileSync(arquivo);

  // 1. cria o container do Reel avisando que o arquivo vai ser enviado por upload
  const container = await igApi(host, versao, `${igId}/media`, {
    metodo: "POST",
    token,
    corpo: { media_type: "REELS", upload_type: "resumable", caption: legenda, share_to_feed: true },
  });
  const uri = container.uri || `https://rupload.facebook.com/ig-api-upload/${versao}/${container.id}`;

  // 2. manda o arquivo do vídeo direto para a Meta (não precisa de link público)
  const up = await fetch(uri, {
    method: "POST",
    headers: { Authorization: `OAuth ${token}`, offset: "0", file_size: String(bytes.length) },
    body: bytes,
  });
  const upJ = await up.json().catch(() => ({}));
  if (!up.ok || upJ.success === false) throw new Error(`Instagram upload ${up.status}: ${JSON.stringify(upJ).slice(0, 200)}`);

  // 3. espera a Meta processar (até ~6 min)
  for (let i = 0; i < 36; i++) {
    await esperar(10000);
    const st = await igApi(host, versao, `${container.id}?fields=status_code,status`, { token });
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR" || st.status_code === "EXPIRED") throw new Error(`Instagram recusou o vídeo: ${st.status ?? st.status_code}`);
    if (i === 35) throw new Error("Instagram demorou demais para processar o vídeo");
  }

  // 4. publica
  const pub = await igApi(host, versao, `${igId}/media_publish`, { metodo: "POST", token, corpo: { creation_id: container.id } });
  let link = "";
  try { link = (await igApi(host, versao, `${pub.id}?fields=permalink`, { token })).permalink ?? ""; } catch {}
  return { id: pub.id, link };
}

// ---------------------------------------------------------------- YouTube
async function tokenGoogle() {
  const id = pegar("YOUTUBE_CLIENT_ID");
  const segredo = pegar("YOUTUBE_CLIENT_SECRET");
  const refresh = pegar("YOUTUBE_REFRESH_TOKEN");
  if (!id || !segredo || !refresh) throw new Error("faltam YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: segredo, refresh_token: refresh, grant_type: "refresh_token" }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) {
    const dica = j.error === "invalid_grant" ? " (rode de novo o autorizar-youtube.mjs; a tela de consentimento precisa estar 'Em produção')" : "";
    throw new Error(`YouTube login: ${j.error_description ?? j.error ?? r.status}${dica}`);
  }
  return j.access_token;
}

export async function publicarYouTube({ arquivo, titulo, descricao, etiquetas }) {
  const token = await tokenGoogle();
  const bytes = fs.readFileSync(arquivo);
  const meta = {
    snippet: { title: titulo, description: descricao, tags: etiquetas, categoryId: "22", defaultLanguage: "pt-BR", defaultAudioLanguage: "pt-BR" },
    status: { privacyStatus: pegar("YOUTUBE_PRIVACIDADE") || "public", selfDeclaredMadeForKids: false },
  };
  // 1. abre o envio
  const ini = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(bytes.length),
      "X-Upload-Content-Type": "video/mp4",
    },
    body: JSON.stringify(meta),
  });
  if (!ini.ok) throw new Error(`YouTube ${ini.status}: ${(await ini.text()).slice(0, 300)}`);
  const destino = ini.headers.get("location");
  if (!destino) throw new Error("YouTube não devolveu o endereço de envio");
  // 2. manda o arquivo
  const up = await fetch(destino, { method: "PUT", headers: { "Content-Type": "video/mp4" }, body: bytes });
  const j = await up.json().catch(() => ({}));
  if (!up.ok || !j.id) throw new Error(`YouTube envio ${up.status}: ${JSON.stringify(j.error ?? j).slice(0, 300)}`);
  const privado = j.status?.privacyStatus && j.status.privacyStatus !== meta.status.privacyStatus;
  return { id: j.id, link: `https://youtube.com/shorts/${j.id}`, aviso: privado ? `o YouTube deixou o vídeo como "${j.status.privacyStatus}"` : "" };
}

// ---------------------------------------------------------------- todas
export async function publicarNasRedes({ arquivo, textoPost, pastaSaida }) {
  const redes = redesAtivas();
  const resultado = {};
  if (!redes.length) {
    console.log("    (PUBLICAR_REDES vazio: não postei em nenhuma rede)");
    return resultado;
  }
  for (const rede of redes) {
    try {
      if (rede === "instagram") {
        resultado.instagram = await publicarInstagram({ arquivo, legenda: legendaInstagram(textoPost), pastaSaida });
      } else if (rede === "youtube") {
        resultado.youtube = await publicarYouTube({ arquivo, ...textosYouTube(textoPost) });
      } else {
        resultado[rede] = { erro: "rede desconhecida (use instagram e/ou youtube)" };
      }
      const r = resultado[rede];
      if (!r.erro) console.log(`    ${rede}: publicado ${r.link || r.id}${r.aviso ? ` (atenção: ${r.aviso})` : ""}`);
    } catch (e) {
      resultado[rede] = { erro: e.message };
      console.log(`    ${rede}: ERRO ${e.message}`);
    }
  }
  return resultado;
}

// Texto curto para o aviso no seu Telegram
export function resumoPublicacao(resultado) {
  const linhas = Object.entries(resultado).map(([rede, r]) =>
    r.erro ? `❌ ${rede}: ${r.erro}` : `✅ ${rede}: ${r.link || r.id}${r.aviso ? ` (⚠️ ${r.aviso})` : ""}`
  );
  return linhas.length ? `\n\nPublicação automática:\n${linhas.join("\n")}` : "";
}
