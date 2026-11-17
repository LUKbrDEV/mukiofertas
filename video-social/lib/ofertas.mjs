// Busca as ofertas do vídeo na tabela `ofertas` do Supabase (via REST, sem dependências).
import { pegar } from "./env.mjs";

// ===== FOCO DOS VÍDEOS =====
// Os vídeos usam primeiro ofertas destas categorias (tecnologia e eletrodomésticos).
// Só se não tiver ofertas boas suficientes delas, completa com as de outras categorias.
// Para trocar sem mexer aqui: VIDEO_CATEGORIAS=celulares,televisores,air-fryer no .env.robo
// Para não ter foco nenhum: VIDEO_CATEGORIAS=todas
export const CATEGORIAS_FOCO = [
  // tecnologia
  "celulares", "smartphones", "acessorios-celular", "tablets", "relogios", "fones", "caixas-de-som",
  "televisores", "tv", "acessorios-tv", "notebook", "notebooks", "acessorios-notebook", "computadores",
  "monitor", "acessorios-monitor", "hardware", "perifericos", "ssd", "memoria-ram", "placa-de-video",
  "processadores", "placa-mae", "gabinete", "fontes", "water-cooler", "outros-informatica", "redes",
  "casa-inteligente", "cameras", "e-readers", "consoles", "games", "controles", "volantes", "placas-captura",
  // eletrodomésticos
  "eletrodomesticos", "eletroportateis", "air-fryer", "ar-condicionado", "geladeiras", "lavadoras",
  "micro-ondas", "fogoes",
];
// ===========================

function categoriasFoco() {
  const env = pegar("VIDEO_CATEGORIAS").trim();
  if (env.toLowerCase() === "todas") return [];
  if (env) return env.split(/[\s,;]+/).filter(Boolean);
  return CATEGORIAS_FOCO;
}

const EMOJI_CATEGORIA = [
  [/celular|smartphone|fone|acessorios-celular/, "📱"],
  [/notebook|computador|hardware|monitor|gabinete|periferic|placa|ssd|memoria/, "💻"],
  [/eletrodom|casa|cozinha|air.?fryer|limpeza/, "🏠"],
  [/perfum|beleza|cosmetic/, "🧴"],
  [/roupa|moda|tenis|calcado|esporte/, "👟"],
  [/brinquedo|bebe|crianca|game|console/, "🎮"],
  [/tv|audio|som/, "📺"],
];
function emojiDa(cat = "") {
  for (const [re, e] of EMOJI_CATEGORIA) if (re.test(cat)) return e;
  return "🛍️";
}

// "Smartphone Samsung Galaxy A16 128GB 4GB RAM Preto" -> "Smartphone Samsung Galaxy A16"
export function tituloCurto(t = "", max = 34) {
  const limpo = t.replace(/\s*[-–|,(].*$/, "").trim() || t;
  if (limpo.length <= max) return limpo;
  return limpo.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

async function imagemComoDataUri(url) {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) return null;
    const tipo = r.headers.get("content-type") || "image/jpeg";
    if (!tipo.startsWith("image/")) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return `data:${tipo};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function buscarOfertas({ quantidade = 5, id, excluir = new Set() } = {}) {
  const url = pegar("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
  const chave = pegar("SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !chave) throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env.local");

  const campos = "id,loja,titulo,categoria,preco_atual,preco_antigo,imagem,cupom,link";
  const agora = new Date().toISOString();
  const filtro = id
    ? `id=eq.${encodeURIComponent(id)}`
    : `ativa=eq.true&imagem=not.is.null&preco_antigo=not.is.null&or=(expires_at.is.null,expires_at.gt.${agora})`;
  // pega um lote recente e escolhe as de maior desconto
  const cab = { headers: { apikey: chave, Authorization: `Bearer ${chave}` } };
  async function lote(filtroExtra = "") {
    let r = await fetch(`${url}/rest/v1/ofertas?select=${campos}&${filtro}${filtroExtra}&order=created_at.desc&limit=300`, cab);
    // se a tabela não tiver created_at, busca sem ordenar
    if (r.status === 400) r = await fetch(`${url}/rest/v1/ofertas?select=${campos}&${filtro}${filtroExtra}&limit=300`, cab);
    if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
    const desconto = (o) => 1 - o.preco_atual / (o.preco_antigo || o.preco_atual);
    let l = (await r.json())
      .map((o) => ({ ...o, preco_atual: Number(o.preco_atual), preco_antigo: Number(o.preco_antigo) || null }))
      .filter((o) => o.preco_atual > 0)
      // só ofertas com desconto real (o gancho mostra o "preço cheio")
      .filter((o) => id || (o.preco_antigo && o.preco_antigo > o.preco_atual * 1.05))
      .sort((a, b) => desconto(b) - desconto(a));
    // não repete ofertas que já saíram em vídeos dos últimos dias (se sobrar pouca coisa, libera)
    const novas = l.filter((o) => !excluir.has(String(o.id)));
    if (novas.length >= 3) l = novas;
    return l;
  }

  // 1º as categorias do foco; se faltar, completa com o resto
  const foco = id ? [] : categoriasFoco();
  let lista = foco.length ? await lote(`&categoria=in.(${foco.map(encodeURIComponent).join(",")})`) : [];
  if (lista.length < quantidade) {
    const ids = new Set(lista.map((o) => o.id));
    lista = [...lista, ...(await lote()).filter((o) => !ids.has(o.id))];
    if (foco.length) console.log(`    poucas ofertas do foco (${ids.size}); completei com outras categorias`);
  }

  // evita repetir a mesma loja nas primeiras posições
  const escolhidas = [];
  for (const o of lista) {
    if (escolhidas.length >= quantidade) break;
    if (escolhidas.length < 3 && escolhidas.some((e) => e.loja === o.loja) && lista.length > quantidade * 2) continue;
    escolhidas.push(o);
  }
  for (const o of lista) if (escolhidas.length < quantidade && !escolhidas.includes(o)) escolhidas.push(o);
  if (!escolhidas.length) throw new Error("Nenhuma oferta ativa com imagem e preço antigo encontrada.");

  return Promise.all(
    escolhidas.map(async (o) => ({
      ...o,
      titulo_curto: tituloCurto(o.titulo),
      emoji: emojiDa(o.categoria),
      imagem: await imagemComoDataUri(o.imagem),
    }))
  );
}
