// Fonte de ofertas: Rakuten Advertising (Product Search API). Começa com a Netshoes,
// e dá para acrescentar outras lojas da Rakuten na lista LOJAS.
// Salve como scripts/fontes/rakuten.mjs. Usada pelo scripts/coletar.mjs.
//
// O que faz:
//   1) pede um token de acesso à Rakuten (vale 1 hora)
//   2) procura produtos da loja por palavras-chave (rodízio a cada 30 min)
//   3) fica só com os que têm desconto de verdade (preço "de" maior que o "por")
//   4) usa o seu link de afiliado que a própria API devolve (linkurl)
//
// Variáveis (no .env.local e no .env da VPS):
//   RAKUTEN_CLIENT_ID      Client ID      (Rakuten → Links → Web Services / Developer Portal)
//   RAKUTEN_CLIENT_SECRET  Client Secret
//   RAKUTEN_SID            o seu Site ID (número de ~7 dígitos, aparece no canto do painel)
//   RAKUTEN_MID_NETSHOES   (opcional) o MID (id do anunciante) da Netshoes na Rakuten
//   (no lugar do Client ID + Secret dá para usar RAKUTEN_TOKEN_KEY, a "Token Key" do portal)
//
// Para testar sem gravar nada no banco:
//   node --env-file=.env.local scripts/testar-rakuten.mjs

import { createClient } from "@supabase/supabase-js";
import { classificar } from "../../lib/classificar.mjs";

// ===== AJUSTES =====
// Lojas da Rakuten: para acrescentar outra, copie a linha, troque o nome, a variável do MID e o prefixo
// O MID é opcional: sem ele, a busca é feita em todas as suas lojas da Rakuten e ficam só os
// produtos cujo nome de loja bate com "nomeNaRakuten" (o MID encontrado aparece no log).
const LOJAS = [{ loja: "Netshoes", nomeNaRakuten: /netshoes/i, variavelMid: "RAKUTEN_MID_NETSHOES", prefixo: "rkt-nts-" }];

const PALAVRAS = [
  // Roupas fitness
  "legging", "top fitness", "conjunto fitness", "short fitness", "camiseta dry fit", "regata",
  "bermuda", "jaqueta corta vento", "calça jogger", "meia esportiva", "bermuda de compressão",
  // Calçados
  "tênis de corrida", "tênis masculino", "tênis feminino", "tênis nike", "tênis adidas", "tênis olympikus",
  "tênis asics", "tênis mizuno", "tênis puma", "chuteira", "chinelo",
  // Suplementos
  "whey protein", "creatina", "pre treino", "barra de proteína", "coqueteleira",
  // Academia e esporte
  "halter", "anilha", "kettlebell", "colchonete", "corda de pular", "tapete de yoga", "luva de academia",
  "bola de futebol", "bicicleta", "mochila", "garrafa", "smartwatch",
];
const BUSCAS_POR_EXECUCAO = 6; // palavras procuradas a cada execução (rodízio a cada 30 min)
const RESULTADOS_POR_BUSCA = 100; // produtos por palavra (máximo da API: 100)
const MAX_POR_PALAVRA = 5; // no máximo X ofertas de cada busca (variedade)
const MAX_POR_EXECUCAO = 30; // ofertas por execução, somando todas as buscas
const DESCONTO_MINIMO = 15; // % (o coletar.mjs ainda aplica o desconto mínimo do painel)
const DESCONTO_MAXIMO = 85; // acima disso é quase sempre erro de preço
const PRECO_MINIMO = 30; // R$
const PALAVRAS_BLOQUEADAS = [/r[eé]plica/i, /\bfake\b/i];
// A Rakuten manda só o preço atual (saleprice vem 0) e a Netshoes bloqueia a leitura das páginas.
// Por isso o preço "de" vem do HISTÓRICO (o mesmo da KaBuM!, historico-feed.sql no Supabase):
// a cada coleta o robô grava o preço de todos os produtos encontrados, e quando um produto fica
// mais barato que o preço normal dele (mediana dos últimos DIAS_HISTORICO dias) vira oferta,
// com esse preço normal como "de". As primeiras ofertas aparecem depois de DIAS_MINIMOS_HISTORICO dias.
const DIAS_HISTORICO = 30;
const DIAS_MINIMOS_HISTORICO = 3;
// ===================

const API = "https://api.linksynergy.com";
const INTERVALO_MS = 1200;
let ultimaChamada = 0;
let token = null; // { valor, expira }
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export const lojasConfiguradas = () => LOJAS;

export function rakutenConfigurada() {
  const temChave = process.env.RAKUTEN_TOKEN_KEY || (process.env.RAKUTEN_CLIENT_ID && process.env.RAKUTEN_CLIENT_SECRET);
  return Boolean(temChave && process.env.RAKUTEN_SID);
}

// ---------- Token de acesso ----------
async function pegarToken() {
  if (token && token.expira > Date.now() + 60_000) return token.valor;
  const chave =
    process.env.RAKUTEN_TOKEN_KEY?.trim() ||
    Buffer.from(`${process.env.RAKUTEN_CLIENT_ID.trim()}:${process.env.RAKUTEN_CLIENT_SECRET.trim()}`).toString("base64");
  const sid = String(process.env.RAKUTEN_SID).trim();

  // A Rakuten aceita só o scope (SID); algumas contas pedem também o grant_type
  const corpos = [`scope=${encodeURIComponent(sid)}`, `grant_type=client_credentials&scope=${encodeURIComponent(sid)}`];
  let ultimoErro = "";
  for (const corpo of corpos) {
    const res = await fetch(`${API}/token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: corpo,
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.access_token) {
      token = { valor: json.access_token, expira: Date.now() + (Number(json.expires_in) || 3600) * 1000 };
      return token.valor;
    }
    ultimoErro = `${res.status} ${json?.error_description || json?.error || res.statusText}`;
  }
  throw new Error(`Rakuten: não consegui o token (${ultimoErro}). Confira RAKUTEN_CLIENT_ID, RAKUTEN_CLIENT_SECRET e RAKUTEN_SID.`);
}

// ---------- Leitura do XML da busca ----------
const desfazer = (t) =>
  String(t ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&")
    .trim();
const campo = (bloco, nome) => {
  const m = bloco.match(new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</${nome}>`, "i"));
  return m ? desfazer(m[1]) : "";
};
const numero = (v) => {
  let s = String(v ?? "").trim().replace(/[^\d.,]/g, "");
  if (!s) return null;
  // "1.299,90" (Brasil) ou "1,299.90" (EUA): o último separador é o dos centavos
  const virgula = s.lastIndexOf(","), ponto = s.lastIndexOf(".");
  if (virgula > ponto) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function lerItens(xml) {
  const erro = campo(xml, "Errors") || campo(xml, "ErrorText");
  if (erro && !/<item>/i.test(xml)) throw new Error(`Rakuten: ${erro}`);
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => {
    const b = m[1];
    return {
      mid: campo(b, "mid"),
      loja: campo(b, "merchantname"),
      sku: campo(b, "sku"),
      titulo: campo(b, "productname"),
      preco: numero(campo(b, "price")),
      promocional: numero(campo(b, "saleprice")),
      link: campo(b, "linkurl"),
      imagem: campo(b, "imageurl"),
    };
  });
}

// ---------- Cupons (Coupon API) — usados pelo scripts/fontes/cupons.mjs ----------
// Devolve os cupons com código das lojas da lista LOJAS, já com o seu link de afiliado (clickurl).
// "permitida(loja)" é o filtro do painel (Configurações → Cupons).
export async function cuponsRakuten({ permitida = () => true, maximo = 40 } = {}) {
  if (!rakutenConfigurada()) return { itens: [], aviso: "sem RAKUTEN_CLIENT_ID/RAKUTEN_CLIENT_SECRET/RAKUTEN_SID" };
  const itens = [];
  let lidos = 0;
  for (const cfg of LOJAS) {
    if (!permitida(cfg.loja)) continue;
    const mid = String(process.env[cfg.variavelMid] ?? "").trim();
    for (let pagina = 1; pagina <= 3 && itens.length < maximo; pagina++) {
      const espera = ultimaChamada + INTERVALO_MS - Date.now();
      if (espera > 0) await esperar(espera);
      ultimaChamada = Date.now();
      const params = new URLSearchParams({ resultsperpage: "100", pagenumber: String(pagina) });
      if (/^\d+$/.test(mid)) params.set("mid", mid);
      const res = await fetch(`${API}/coupon/1.0?${params}`, {
        headers: { Authorization: `Bearer ${await pegarToken()}`, Accept: "application/xml" },
      });
      const xml = await res.text();
      if (res.status === 401) token = null;
      if (!res.ok) throw new Error(`Rakuten cupons ${res.status}: ${xml.slice(0, 200)}`);
      const blocos = [...xml.matchAll(/<link\b[^>]*>([\s\S]*?)<\/link>/gi)].map((m) => m[1]);
      lidos += blocos.length;
      for (const b of blocos) {
        const nomeLoja = campo(b, "advertisername");
        if (!cfg.nomeNaRakuten.test(nomeLoja)) continue;
        const codigo = campo(b, "couponcode");
        const link = campo(b, "clickurl");
        if (!codigo || !link) continue; // sem código: é só uma promoção, não um cupom
        const descricao = campo(b, "offerdescription");
        const fim = campo(b, "offerenddate");
        const id = `cpr-${campo(b, "advertiserid") || "x"}-${codigo}`.slice(0, 80);
        if (itens.some((c) => c.id === id)) continue;
        itens.push({
          loja: cfg.loja,
          id,
          titulo: descricao || `Cupom ${cfg.loja}`,
          codigo,
          link,
          fim: fim ? `${fim.slice(0, 10)}T23:59:59-03:00` : null,
          descricao: [descricao, campo(b, "couponrestriction")].filter(Boolean).join("\n\n"),
        });
        if (itens.length >= maximo) break;
      }
      const totalPaginas = Number(campo(xml, "TotalPages")) || 1;
      if (pagina >= totalPaginas || blocos.length < 100) break;
    }
  }
  return { itens, aviso: `${lidos} cupons/promoções lidos` };
}

// Resposta crua da API (para o diagnóstico do testar-rakuten.mjs --bruto)
export async function buscarBruto(palavra, mid = "", max = 3) {
  const params = new URLSearchParams({ keyword: palavra, max: String(max), pagenumber: "1" });
  if (mid) params.set("mid", mid);
  const res = await fetch(`${API}/productsearch/1.0?${params}`, {
    headers: { Authorization: `Bearer ${await pegarToken()}`, Accept: "application/xml" },
  });
  return res.text();
}

async function buscarPorPalavra(palavra, mid) {
  const espera = ultimaChamada + INTERVALO_MS - Date.now();
  if (espera > 0) await esperar(espera);
  ultimaChamada = Date.now();

  const params = new URLSearchParams({ keyword: palavra, max: String(RESULTADOS_POR_BUSCA), pagenumber: "1" });
  if (mid) params.set("mid", mid);
  const res = await fetch(`${API}/productsearch/1.0?${params}`, {
    headers: { Authorization: `Bearer ${await pegarToken()}`, Accept: "application/xml" },
  });
  const texto = await res.text();
  if (res.status === 401) token = null; // token venceu: pede outro na próxima
  if (!res.ok) throw new Error(`Rakuten ${res.status}: ${texto.slice(0, 200)}`);
  return lerItens(texto);
}

// Um produto da API vira uma oferta do site (ou null se não servir).
// Sem preço "de" na API, a oferta volta com preco_antigo null (o histórico preenche depois).
export function converter(p, cfg) {
  if (!p.titulo || !p.link || !p.sku || !p.preco) return null;
  if (PALAVRAS_BLOQUEADAS.some((re) => re.test(p.titulo))) return null;
  const comPromocao = p.promocional && p.promocional < p.preco;
  const atual = comPromocao ? p.promocional : p.preco;
  if (atual < PRECO_MINIMO) return null;
  const titulo = p.titulo.replace(/\s+/g, " ").trim().slice(0, 200);
  const categoria = classificar(titulo, cfg.loja);
  if (!categoria) return null;
  return {
    loja: cfg.loja,
    id_externo: `${cfg.prefixo}${p.sku}`,
    titulo,
    categoria,
    preco_atual: Math.round(atual * 100) / 100,
    preco_antigo: comPromocao ? Math.round(p.preco * 100) / 100 : null,
    link: p.link,
    imagem: p.imagem || null,
  };
}

const desconto = (o) => (o.preco_antigo ? Math.round(((o.preco_antigo - o.preco_atual) / o.preco_antigo) * 100) : 0);
const bomDesconto = (o) => desconto(o) >= DESCONTO_MINIMO && desconto(o) < DESCONTO_MAXIMO;

// ---------- Histórico de preços (preço "de" = preço normal dos últimos dias) ----------
const banco = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

// Mesma chave que o banco usa no histórico (função chave_do_produto)
const chaveDoProduto = (o) => `id:${o.loja.toLowerCase()}|${o.id_externo}`;

async function aplicarHistorico(produtos) {
  const resumo = { gravados: 0, "com histórico": 0, "abaixo do normal": 0 };
  const db = banco();
  if (!db || !produtos.length) return resumo;

  // 1) grava o preço de hoje
  for (let i = 0; i < produtos.length; i += 1000) {
    const lote = produtos.slice(i, i + 1000).map((o) => ({ loja: o.loja, id_externo: o.id_externo, titulo: o.titulo, preco: o.preco_atual }));
    const { data, error } = await db.rpc("registrar_precos_feed", { itens: lote });
    if (error) {
      console.warn(`[rakuten] histórico: ${error.message} (rodou o historico-feed.sql no Supabase?)`);
      return resumo;
    }
    resumo.gravados += data ?? 0;
  }

  // 2) preço normal de cada produto (mediana dos últimos dias)
  for (let i = 0; i < produtos.length; i += 1000) {
    const parte = produtos.slice(i, i + 1000);
    const { data, error } = await db.rpc("precos_de_referencia", {
      chaves: parte.map(chaveDoProduto),
      dias: DIAS_HISTORICO,
      minimo_dias: DIAS_MINIMOS_HISTORICO,
    });
    if (error) {
      console.warn(`[rakuten] histórico: ${error.message}`);
      return resumo;
    }
    const normal = new Map((data ?? []).map((r) => [r.chave, Number(r.referencia)]));
    for (const o of parte) {
      const ref = normal.get(chaveDoProduto(o));
      if (!ref) continue;
      resumo["com histórico"]++;
      if (!o.preco_antigo && ref > o.preco_atual) {
        o.preco_antigo = Math.round(ref * 100) / 100;
        resumo["abaixo do normal"]++;
      }
    }
  }
  return resumo;
}

function palavrasDaVez() {
  const blocos = Math.max(1, Math.ceil(PALAVRAS.length / BUSCAS_POR_EXECUCAO));
  const vez = Math.floor(Date.now() / (30 * 60 * 1000)) % blocos; // muda a cada 30 min
  return PALAVRAS.slice(vez * BUSCAS_POR_EXECUCAO, (vez + 1) * BUSCAS_POR_EXECUCAO);
}

// Mesmo modelo em outra cor/tamanho conta como repetido
const chaveDoModelo = (titulo) =>
  String(titulo).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim().split(" ").slice(0, 6).join(" ");

// ---------- Função usada pelo coletar.mjs ----------
export async function buscar({ palavras } = {}) {
  if (!rakutenConfigurada()) {
    console.log("[rakuten] Faltam RAKUTEN_CLIENT_ID/RAKUTEN_CLIENT_SECRET e RAKUTEN_SID: pulando.");
    return [];
  }
  const lojas = lojasConfiguradas();

  const resultado = [];
  for (const cfg of lojas) {
    let mid = String(process.env[cfg.variavelMid] ?? "").trim();
    if (mid && !/^\d+$/.test(mid)) {
      console.warn(`[rakuten] ${cfg.variavelMid}="${mid}" não é um número: buscando sem MID (pelo nome da loja).`);
      mid = "";
    }
    const midsVistos = new Set();

    // 1) Busca todas as palavras da vez e guarda os produtos (sem repetir)
    const porPalavra = [];
    const jaVisto = new Set();
    for (const palavra of palavras ?? palavrasDaVez()) {
      try {
        const todos = await buscarPorPalavra(palavra, mid);
        const itens = mid ? todos : todos.filter((p) => cfg.nomeNaRakuten.test(p.loja));
        for (const p of itens) if (p.mid) midsVistos.add(p.mid);
        const convertidos = itens.map((p) => converter(p, cfg)).filter((o) => o && !jaVisto.has(o.id_externo));
        for (const o of convertidos) jaVisto.add(o.id_externo);
        porPalavra.push({ palavra, total: itens.length, ofertas: convertidos });
      } catch (erro) {
        console.warn(`[rakuten] Falha em "${palavra}": ${erro.message}`);
        if (/token/i.test(erro.message)) throw erro; // chave errada vale para todas as buscas: para logo
      }
    }

    // 2) Sem preço "de" na API: usa o histórico de preços
    const todosProdutos = porPalavra.flatMap((x) => x.ofertas);
    const resumo = await aplicarHistorico(todosProdutos.filter((o) => !o.preco_antigo));
    console.log(`[rakuten] ${cfg.loja}: histórico →`, JSON.stringify(resumo));

    // 3) Escolhe as melhores de cada palavra
    const vistos = new Set();
    let daLoja = 0;
    for (const b of porPalavra) {
      const bons = b.ofertas.filter(bomDesconto).sort((x, y) => desconto(y) - desconto(x));
      let usados = 0;
      for (const o of bons) {
        if (usados >= MAX_POR_PALAVRA || daLoja >= MAX_POR_EXECUCAO) break;
        const chave = chaveDoModelo(o.titulo);
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        resultado.push(o);
        usados++;
        daLoja++;
      }
      console.log(`[rakuten] ${cfg.loja} "${b.palavra}": ${b.total} produtos, ${bons.length} com desconto, ${usados} escolhidos`);
    }
    if (!mid && midsVistos.size)
      console.log(`[rakuten] MID da ${cfg.loja} encontrado: ${[...midsVistos].join(", ")} (pode colocar em ${cfg.variavelMid})`);
  }
  return resultado;
}
