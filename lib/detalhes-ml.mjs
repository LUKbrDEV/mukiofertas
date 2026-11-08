// Busca "Sobre o produto" e "Especificações" de uma oferta do Mercado Livre pela API pública.
// Salve como lib/detalhes-ml.mjs.
//
// Uso:  const detalhes = await buscarDetalhesML(link);
//       -> { sobre: ["tópico 1", ...], especificacoes: [{ nome, valor }, ...] }  ou  null
//
// A API do Mercado Livre exige login (token). O token é obtido sozinho a partir de
// ML_CLIENT_ID e ML_CLIENT_SECRET (do app criado em developers.mercadolivre.com.br):
// primeiro pelo fluxo Client Credentials; se o Mercado Livre não aceitar, pelo
// refresh token salvo no Supabase pelo scripts/ml-token.mjs.

import { createClient } from "@supabase/supabase-js";

const API = "https://api.mercadolibre.com";
const MAX_TOPICOS = 12;
const MAX_ESPECIFICACOES = 20;

// Atributos internos que não interessam para quem está comprando
const ATRIBUTOS_IGNORADOS = new Set([
  "ITEM_CONDITION", "GTIN", "SELLER_SKU", "SKU", "EAN", "UPC", "MPN",
  "SALE_FORMAT", "SHIPMENT_PACKING", "IS_KIT", "IS_FLAMMABLE", "IS_HIGHLIGHT_BRAND",
  "IS_TOM_BRAND", "PACKAGE_LENGTH", "PACKAGE_WIDTH", "PACKAGE_HEIGHT", "PACKAGE_WEIGHT",
  "PRODUCT_DATA_SOURCE", "EXCLUSIVE_CHANNEL", "GTIN_REASON", "EMPTY_GTIN_REASON",
  "HAS_COMPATIBILITIES", "ORIGIN", "SHIPPING_TIME",
]);

// Trechos que citam a loja, o vendedor ou a entrega: a linha inteira é descartada
const PROIBIDOS = [
  /mercado\s*livre/i, /mercadolivre/i, /mercado\s*pago/i, /\bmeli\b/i, /\b(envio|log[ií]stica)\s+full\b/i,
  /\bloja\b/i, /vendedor/i, /vendido/i, /entregue/i, /envio/i, /frete/i, /despach/i,
  /nota fiscal/i, /\bnf-?e?\b/i, /pronta entrega/i, /estoque/i, /compre/i, /comprar/i,
  /pergunt/i, /avalia/i, /qualifica/i, /reputa/i, /atendimento/i, /whats/i, /telefone/i,
  /https?:\/\//i, /www\./i, /@/, /\.com/i, /garantia (do|da) (vendedor|loja)/i,
];

const NAVEGADOR = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9",
};

// Guarda o passo a passo da última busca (usado pelo modo --debug do script)
let registro = [];
const anotar = (passo) => registro.push(passo);

// ===== Token da API =====
const CHAVE_REFRESH = "ml_refresh_token";
let tokenEmCache = null; // { valor, expira }
let renovando = null; // evita duas renovações ao mesmo tempo

function banco() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  return createClient(url, chave, { auth: { persistSession: false } });
}

export async function lerConfig(chave) {
  const db = banco();
  if (!db) return null;
  const { data } = await db.from("configuracoes").select("valor").eq("chave", chave).maybeSingle();
  return data?.valor ?? null;
}

export async function salvarConfig(chave, valor) {
  const db = banco();
  if (!db) throw new Error("Faltam as variáveis do Supabase");
  const { error } = await db
    .from("configuracoes")
    .upsert({ chave, valor, atualizado_em: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

async function pedirToken(campos) {
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(campos),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) anotar(`Token (${campos.grant_type}) recusado: ${res.status} ${json.message ?? ""}`);
  return res.ok ? json : null;
}

async function renovarToken() {
  const client_id = process.env.ML_CLIENT_ID;
  const client_secret = process.env.ML_CLIENT_SECRET;
  if (!client_id || !client_secret) {
    anotar("ML_CLIENT_ID e ML_CLIENT_SECRET não configurados");
    return null;
  }

  // 1º caminho: token da sua conta (refresh token salvo pelo scripts/ml-token.mjs).
  // Ele lê mais coisas da API, como as especificações do anúncio.
  const refresh = await lerConfig(CHAVE_REFRESH);
  if (refresh) {
    const json = await pedirToken({ grant_type: "refresh_token", client_id, client_secret, refresh_token: refresh });
    if (json?.access_token) {
      // O Mercado Livre troca o refresh token a cada renovação: guarda o novo
      if (json.refresh_token && json.refresh_token !== refresh) {
        await salvarConfig(CHAVE_REFRESH, json.refresh_token);
      }
      anotar("Token da conta renovado");
      return { valor: json.access_token, expira: Date.now() + (json.expires_in ?? 21600) * 1000 - 60000 };
    }
  }

  // 2º caminho: Client Credentials (só com o Client ID e a Secret). Lê a descrição,
  // mas o Mercado Livre bloqueia os dados do anúncio (especificações) para esse tipo de token.
  const direto = await pedirToken({ grant_type: "client_credentials", client_id, client_secret });
  if (direto?.access_token) {
    anotar("Token obtido por Client Credentials");
    return { valor: direto.access_token, expira: Date.now() + (direto.expires_in ?? 21600) * 1000 - 60000 };
  }
  return null;
}

async function obterToken() {
  if (process.env.ML_ACCESS_TOKEN) return process.env.ML_ACCESS_TOKEN;
  if (tokenEmCache && tokenEmCache.expira > Date.now()) return tokenEmCache.valor;
  if (!renovando) {
    renovando = renovarToken().finally(() => {
      renovando = null;
    });
  }
  tokenEmCache = await renovando;
  return tokenEmCache?.valor ?? null;
}

async function pegarJson(caminho, tentativa = 1) {
  const token = await obterToken();
  const res = await fetch(`${API}${caminho}`, {
    headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  anotar(`API ${caminho} -> ${res.status}${token ? "" : " (sem token)"}`);

  // Token vencido: renova e tenta de novo uma vez
  if (res.status === 401 && token && tentativa === 1 && !process.env.ML_ACCESS_TOKEN) {
    tokenEmCache = null;
    return pegarJson(caminho, 2);
  }
  if (!res.ok) return null;
  return res.json();
}

// Procura o código do anúncio (item ou catálogo) dentro de um texto (URL ou HTML)
function acharCodigo(texto) {
  const doItem = texto.match(/[?&#;](?:item_id|wid)=(MLB\d{6,})/i);
  if (doItem) return { tipo: "item", id: doItem[1].toUpperCase() };

  const doCatalogo = texto.match(/\/p\/(MLB\d{6,})/i);
  if (doCatalogo) return { tipo: "produto", id: doCatalogo[1].toUpperCase() };

  const doAnuncio = texto.match(/MLB-?(\d{8,})/i);
  if (doAnuncio) return { tipo: "item", id: `MLB${doAnuncio[1]}` };

  return null;
}

// Descobre o código do anúncio (MLB...) a partir do link.
// Links curtos (meli.la) e de afiliado levam a uma página intermediária: nesse caso
// o código é procurado também dentro do HTML dessa página.
async function identificar(link) {
  const url = String(link || "");
  if (!url) return null;

  const direto = acharCodigo(url);
  if (direto) return direto;

  try {
    const res = await fetch(url, { redirect: "follow", headers: NAVEGADOR });
    anotar(`Link abriu em ${res.url} (${res.status})`);

    const pelaUrl = acharCodigo(res.url || "");
    if (pelaUrl) return pelaUrl;

    const html = await res.text();
    const peloHtml = acharCodigo(html);
    if (!peloHtml) anotar("Nenhum código MLB encontrado no link nem na página");
    return peloHtml;
  } catch (erro) {
    anotar(`Falha ao abrir o link: ${erro.message}`);
    return null;
  }
}

// Quebra um parágrafo longo em frases
function emFrases(linha) {
  if (linha.length <= 300) return [linha];
  return linha
    .split(/(?<=[.!?;])\s+(?=[A-ZÀ-Ú0-9])/)
    .map((f) => f.trim())
    .filter(Boolean);
}

// Transforma o texto da descrição em tópicos limpos
function textoEmTopicos(texto) {
  return String(texto || "")
    .replace(/\r/g, "")
    .split(/\n+|•|(?:^|\s)[-–*✔✅►▶➡]\s/)
    .map((linha) => linha.replace(/\s+/g, " ").replace(/^[\s:;,.\-–*•✔✅►▶➡]+/, "").trim())
    .flatMap(emFrases)
    .filter((linha) => linha.length >= 15 && linha.length <= 400)
    .filter((linha) => !PROIBIDOS.some((re) => re.test(linha)))
    .filter((linha, i, todas) => todas.indexOf(linha) === i)
    .slice(0, MAX_TOPICOS);
}

function atributosEmEspecificacoes(atributos) {
  return (atributos ?? [])
    .filter((a) => a?.name && a?.value_name && !ATRIBUTOS_IGNORADOS.has(a.id))
    .filter((a) => !PROIBIDOS.some((re) => re.test(`${a.name} ${a.value_name}`)))
    .map((a) => ({ nome: a.name.trim(), valor: String(a.value_name).trim() }))
    .filter((a, i, todas) => todas.findIndex((b) => b.nome === a.nome) === i)
    .slice(0, MAX_ESPECIFICACOES);
}

export async function buscarDetalhesML(link) {
  registro = [];
  try {
    const alvo = await identificar(link);
    if (!alvo) return null;
    anotar(`Código: ${alvo.id} (${alvo.tipo === "produto" ? "catálogo" : "anúncio"})`);

    let sobre = [];
    let especificacoes = [];
    let titulo = null; // nome oficial do produto no Mercado Livre

    if (alvo.tipo === "produto") {
      // Página de catálogo (/p/MLB...)
      const produto = await pegarJson(`/products/${alvo.id}`);
      if (!produto) return null;
      titulo = produto.name ?? null;
      const destaques = (produto.main_features ?? []).map((f) => f.text).join("\n");
      sobre = textoEmTopicos(destaques || produto.short_description?.content);
      especificacoes = atributosEmEspecificacoes(produto.attributes);

      // Catálogo sem texto: usa a descrição do anúncio que está vendendo o produto
      const vencedor = produto.buy_box_winner?.item_id;
      if (sobre.length === 0 && vencedor) {
        const descricao = await pegarJson(`/items/${vencedor}/description`);
        sobre = textoEmTopicos(descricao?.plain_text);
      }
    } else {
      // Anúncio comum (MLB123...)
      const [item, descricao] = await Promise.all([
        pegarJson(`/items/${alvo.id}`),
        pegarJson(`/items/${alvo.id}/description`),
      ]);
      if (!item && !descricao) return null;
      titulo = item?.title ?? null;
      sobre = textoEmTopicos(descricao?.plain_text);
      especificacoes = atributosEmEspecificacoes(item?.attributes);
    }

    anotar(`Encontrados: ${sobre.length} tópicos, ${especificacoes.length} especificações`);
    if (sobre.length === 0 && especificacoes.length === 0 && !titulo) return null;
    return { sobre, especificacoes, titulo };
  } catch (erro) {
    console.warn("[detalhes-ml] Não foi possível buscar os detalhes:", erro.message);
    return null;
  }
}

// Passo a passo da última chamada de buscarDetalhesML (para diagnóstico)
export const ultimoRegistro = () => [...registro];

export const ehMercadoLivre = (loja) => /mercado\s*livre/i.test(String(loja || ""));

export const lerApiML = (caminho) => pegarJson(caminho);