// Busca as ofertas do vídeo na tabela `ofertas` do Supabase (via REST, sem dependências).
import { pegar } from "./env.mjs";

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
  let r = await fetch(`${url}/rest/v1/ofertas?select=${campos}&${filtro}&order=created_at.desc&limit=200`, cab);
  // se a tabela não tiver created_at, busca sem ordenar
  if (r.status === 400) r = await fetch(`${url}/rest/v1/ofertas?select=${campos}&${filtro}&limit=200`, cab);
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  let lista = await r.json();
  lista = lista
    .map((o) => ({ ...o, preco_atual: Number(o.preco_atual), preco_antigo: Number(o.preco_antigo) || null }))
    .filter((o) => o.preco_atual > 0)
    // só ofertas com desconto real (o gancho mostra o "preço cheio")
    .filter((o) => id || (o.preco_antigo && o.preco_antigo > o.preco_atual * 1.05))
    .sort((a, b) => (1 - a.preco_atual / (a.preco_antigo || a.preco_atual)) < (1 - b.preco_atual / (b.preco_antigo || b.preco_atual)) ? 1 : -1);

  // não repete ofertas que já saíram em vídeos dos últimos dias (se sobrar pouca coisa, libera)
  const novas = lista.filter((o) => !excluir.has(String(o.id)));
  if (novas.length >= 3) lista = novas;

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
