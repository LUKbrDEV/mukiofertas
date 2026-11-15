// Compra em grupo: grava produtos e grupos no banco (lado do servidor, com a chave de serviço).
// Salve como lib/grupo-produtos.mjs.
// Usado por: app/api/compra-em-grupo (divulgar), app/api/admin/compra-em-grupo (painel)
// e lib/salvar-oferta.js (postagens de "grupo de 3" do Telegram).

import { extrairOferta, normalizarLink } from "./extrair-oferta.mjs";

export function ehLinkAliExpress(link) {
  try {
    const h = new URL(link).hostname.toLowerCase();
    return h === "aliexpress.com" || h.endsWith(".aliexpress.com") || h.endsWith(".aliexpress.us");
  } catch {
    return false;
  }
}

const dinheiro = (v) => {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 && v < 100000 ? Math.round(v * 100) / 100 : null;
  let t = String(v ?? "").replace(/[^\d.,]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) && n > 0 && n < 100000 ? Math.round(n * 100) / 100 : null;
};

// link já lido nesta execução -> dados (o mesmo produto aparece em vários canais)
const lidos = new Map();

// Garante o produto em grupos_produtos a partir de um link do AliExpress (produto ou grupo).
// Devolve { produtoId, titulo, imagem } ou { erro, precisaProduto? }
export async function garantirProduto(db, { link, precoGrupo = null, origem = "comunidade", novoGrupo = false }) {
  const url = normalizarLink(link);
  if (!url || !ehLinkAliExpress(url)) return { erro: "O link precisa ser do AliExpress." };

  let dados = lidos.get(url);
  if (!dados) {
    dados = await extrairOferta(url);
    if (!dados.erro && dados.codigo) lidos.set(url, dados);
  }
  if (dados.erro) return { erro: dados.erro };
  if (!dados.codigo) return { erro: "Não encontramos o produto do AliExpress nesse link.", precisaProduto: true };

  const produtoId = String(dados.codigo);
  const preco = dinheiro(precoGrupo);
  const { data: atual } = await db.from("grupos_produtos").select("id, grupos_criados, origem").eq("id", produtoId).maybeSingle();

  const campos = {
    titulo: (dados.titulo || "Produto do AliExpress").slice(0, 200),
    imagem: dados.imagem || null,
    categoria: dados.categoria || null,
    preco_normal: dados.preco_atual ?? null,
    link_afiliado: dados.afiliado ? dados.link_afiliado : null,
    atualizado_em: new Date().toISOString(),
  };
  // preço de grupo: o mais recente (só se for menor que o preço normal, quando ele é conhecido)
  if (preco && (!campos.preco_normal || preco < campos.preco_normal)) campos.preco_grupo = preco;

  let resposta;
  if (atual) {
    const mudar = Object.fromEntries(Object.entries(campos).filter(([, v]) => v !== null));
    if (novoGrupo) mudar.grupos_criados = (atual.grupos_criados ?? 0) + 1;
    resposta = await db.from("grupos_produtos").update(mudar).eq("id", produtoId);
  } else {
    resposta = await db
      .from("grupos_produtos")
      .insert({ id: produtoId, ...campos, origem, grupos_criados: novoGrupo ? 1 : 0 });
  }
  // banco ainda sem a coluna "origem" (parte 3 do SQL não rodada): grava sem ela
  if (resposta.error && /origem/.test(resposta.error.message) && !atual) {
    resposta = await db.from("grupos_produtos").insert({ id: produtoId, ...campos, grupos_criados: novoGrupo ? 1 : 0 });
  }
  if (resposta.error) {
    console.error("Erro ao salvar produto de grupo:", resposta.error.message);
    return {
      erro: /grupos_produtos/.test(resposta.error.message)
        ? "A compra em grupo ainda não foi ativada no banco (supabase/compra-em-grupo.sql)."
        : "Não foi possível salvar o produto agora.",
    };
  }
  return { produtoId, titulo: campos.titulo, imagem: campos.imagem, novo: !atual };
}

// Grava um grupo aberto. Devolve { ok } ou { erro, existente }
export async function criarGrupo(db, { produtoId, linkGrupo, faltam = 2, autorId = null, autorNome = null }) {
  const { error } = await db.from("grupos_compra").insert({
    produto_id: produtoId,
    link: normalizarLink(linkGrupo) || linkGrupo,
    faltam: [1, 2].includes(Number(faltam)) ? Number(faltam) : 2,
    autor_id: autorId,
    autor_nome: autorNome ? String(autorNome).slice(0, 40) : null,
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { erro: "Esse grupo já está na lista.", existente: true };
    console.error("Erro ao salvar grupo:", error.message);
    return { erro: "Não foi possível salvar o grupo agora." };
  }
  return { ok: true };
}

// ---------- Postagens do Telegram ----------
// "[Grupo de 3] Fone KZ ... R$ 9,79 a.aliexpress.com/_xxx" → produto entra em "Para abrir grupo"
// "Participe da compra em grupo do seu amigo ... a.aliexpress.com/_yyy" → é o convite de um grupo aberto
const RE_GRUPO = /grupo\s*de\s*(3|tr[eê]s)|compra(s)?\s*em\s*grupo|compras?\s*de\s*3|\[\s*grupo/i;
const RE_CONVITE = /participe\s+da\s+compra\s+em\s+grupo|entre\s+no\s+meu\s+grupo|meu\s+grupo\s+de\s+3|falta(m)?\s+(s[oó]\s+)?(1|2|uma|duas)\s+pessoas?/i;

export const ehPostagemDeGrupo = (texto) => RE_GRUPO.test(String(texto ?? ""));

function linksAliExpress(texto) {
  return [...String(texto ?? "").matchAll(/https?:\/\/[^\s<>"')\]]+/gi)]
    .map((m) => m[0].replace(/[.,;!?]+$/, ""))
    .filter(ehLinkAliExpress);
}

function faltamDoTexto(texto) {
  const m = String(texto).match(/falta(m)?\s+(s[oó]\s+)?(1|2|uma|duas)\b/i);
  if (!m) return 2;
  return /^(1|uma)$/i.test(m[3]) ? 1 : 2;
}

// precoAtual: o preço que o parse-oferta achou na postagem (é o preço de grupo)
export async function registrarGrupoDoTelegram(db, texto, { precoAtual = null } = {}) {
  if (!ehPostagemDeGrupo(texto) && !RE_CONVITE.test(String(texto ?? ""))) return null;
  const links = linksAliExpress(texto);
  if (!links.length) return null;

  const convite = RE_CONVITE.test(texto) && links.length === 1;
  if (convite) {
    const { data: ja } = await db.from("grupos_compra").select("id").eq("link", normalizarLink(links[0])).maybeSingle();
    if (ja) return { grupo: false, repetido: true };
  }
  const r = await garantirProduto(db, { link: links[0], precoGrupo: precoAtual, origem: "telegram", novoGrupo: convite });
  if (r.erro) return { erro: r.erro };
  if (convite) {
    const g = await criarGrupo(db, { produtoId: r.produtoId, linkGrupo: links[0], faltam: faltamDoTexto(texto), autorNome: "Telegram" });
    return { produtoId: r.produtoId, grupo: Boolean(g.ok) };
  }
  return { produtoId: r.produtoId, grupo: false };
}
