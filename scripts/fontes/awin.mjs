// Fonte de ofertas: Awin (feed de produtos). Começa com a KaBuM!, e dá para acrescentar
// outras lojas da Awin na lista FEEDS.
// Salve como scripts/fontes/awin.mjs. Usada pelo scripts/coletar.mjs.
//
// O que faz:
//   1) baixa o feed de produtos da loja na Awin (arquivo com o catálogo, preço atual e preço "de")
//   2) fica só com os produtos em estoque e com desconto de verdade
//   3) usa o seu link de afiliado da Awin (aw_deep_link) que já vem no feed
//
// O feed tem o catálogo inteiro, então ele é baixado de algumas em algumas horas (não a cada 30 min).
//
// Quando a loja não manda o preço "de" no feed (é o caso da KaBuM!), o robô usa o histórico:
// a cada download ele grava o preço de todos os produtos, e quando um produto fica mais barato
// que o preço normal dele (mediana dos últimos 30 dias) vira oferta, com esse preço normal como "de".
// Por isso as primeiras ofertas aparecem depois de alguns dias de histórico (veja DIAS_MINIMOS_HISTORICO).
// Precisa do historico-precos.sql e do historico-feed.sql rodados no Supabase.
//
// Além disso, o robô abre a página do produto na loja e lê o preço riscado ("de R$ X") que a
// loja mostra. Assim a oferta entra no mesmo dia, sem esperar o histórico. Ele abre o endereço
// direto da loja (merchant_deep_link), nunca o link de afiliado, para não gerar cliques falsos.
// Cada página é lida no máximo 1 vez a cada HORAS_ENTRE_LEITURAS (fica guardado na tabela
// precos_pagina, criada pelo kabum-paginas.sql).
//
// Variáveis (no .env.local e nos Secrets do GitHub):
//   AWIN_FEED_KABUM   o endereço do feed da KaBuM! que a Awin gera em Toolbox → Create-a-Feed
//                     (começa com https://productdata.awin.com/datafeed/download/apikey/...)
//
// Para testar sem gravar nada no banco:
//   node --env-file=.env.local scripts/testar-awin.mjs

import { gunzipSync } from "node:zlib";
import { createClient } from "@supabase/supabase-js";
import { classificar } from "../../lib/classificar.mjs";
import { descontoMinimoDa, CONFIG_ROBO, CATEGORIAS_TECNOLOGIA } from "../../lib/prazos.mjs";

// ===== AJUSTES =====
// Lojas da Awin: para acrescentar outra, copie a linha, troque o nome, a variável e o prefixo
const FEEDS = [{ loja: "KaBuM!", variavel: "AWIN_FEED_KABUM", prefixo: "awn-kbm-" }];

// Valores que podem ser trocados no painel admin (Configurações → Awin / KaBuM!)
const PADRAO = {
  awin_ativo: true,
  awin_preco_minimo: 30, // R$ — só ofertas acima desse preço
  awin_max_por_execucao: 40, // ofertas por loja a cada download
  awin_horas_entre_downloads: 3, // baixa o feed de X em X horas
  awin_ler_paginas: true, // abre a página do produto para ler o preço "de"
  awin_paginas_por_execucao: 80, // páginas lidas a cada download
};
const DESCONTO_MAXIMO = 85; // acima disso é quase sempre erro de preço no feed
const DIAS_HISTORICO = 30; // o preço normal é a mediana destes últimos dias
const DIAS_MINIMOS_HISTORICO = 3; // precisa ter o preço de pelo menos X dias para comparar
const MAX_POR_CATEGORIA = 6; // variedade: no máximo X ofertas da mesma categoria por download
const HORAS_ENTRE_LEITURAS = 20; // relê a página do mesmo produto só depois de X horas
const PAGINAS_AO_MESMO_TEMPO = 3; // páginas abertas em paralelo (não sobrecarregar a loja)
const BLOQUEIOS_PARA_PARAR = 5; // se a loja bloquear X vezes seguidas, para de ler páginas
// ===================

function ajuste(chave) {
  const v = CONFIG_ROBO?.[chave];
  if (typeof PADRAO[chave] === "boolean") return typeof v === "boolean" ? v : PADRAO[chave];
  return v !== undefined && v !== null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : PADRAO[chave];
}

export const feedsConfigurados = () => FEEDS.filter((f) => process.env[f.variavel]);

// ---------- Leitura do arquivo CSV do feed ----------
// Aceita campos entre aspas com vírgulas, quebras de linha e aspas duplas ("") dentro.
export function lerCsv(texto, separador = ",") {
  const linhas = [];
  let campo = "";
  let linha = [];
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else aspas = false;
      } else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === separador) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += c;
  }
  if (campo || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }
  const [cabecalho = [], ...dados] = linhas;
  const nomes = cabecalho.map((n) => n.trim().toLowerCase());
  return dados
    .filter((l) => l.length > 1)
    .map((l) => Object.fromEntries(nomes.map((n, i) => [n, l[i] ?? ""])));
}

const numero = (v) => {
  if (v === undefined || v === null || v === "") return null;
  let s = String(v).trim().replace(/[^\d.,]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export async function baixarFeed(url) {
  const resposta = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!resposta.ok) {
    const texto = (await resposta.text()).slice(0, 200);
    throw new Error(`a Awin respondeu ${resposta.status}: ${texto}`);
  }
  let dados = Buffer.from(await resposta.arrayBuffer());
  // gzip (o endereço do Create-a-Feed costuma ter /compression/gzip/)
  if (dados[0] === 0x1f && dados[1] === 0x8b) dados = gunzipSync(dados);
  const texto = dados.toString("utf8");
  const separador = texto.slice(0, texto.indexOf("\n")).includes("|") ? "|" : ",";
  return lerCsv(texto, separador);
}

// Endereço direto do produto na loja (sem passar pela Awin)
function enderecoDaLoja(linha) {
  if (/^https?:\/\//i.test(linha.merchant_deep_link ?? "")) return linha.merchant_deep_link;
  try {
    const ued = new URL(linha.aw_deep_link).searchParams.get("ued"); // o link da Awin leva o endereço da loja aqui
    if (/^https?:\/\//i.test(ued ?? "")) return ued;
  } catch {}
  return null;
}

// Uma linha do feed vira uma oferta do site (ou null se não servir)
export function converter(linha, feed) {
  const atual = numero(linha.search_price ?? linha.price ?? linha.store_price);
  // preço "de": product_price_old (preço antigo da loja) ou rrp_price (preço sugerido)
  const antigo = numero(linha.product_price_old) ?? numero(linha.rrp_price);
  const link = linha.aw_deep_link || linha.merchant_deep_link;
  const pagina = enderecoDaLoja(linha);
  const titulo = String(linha.product_name ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  const emEstoque = !("in_stock" in linha) || linha.in_stock === "" ? true : !/^(0|false|no|não)$/i.test(linha.in_stock);
  const id = linha.aw_product_id || linha.merchant_product_id || linha.product_id;
  if (!atual || !link || !titulo || !id || !emEstoque) return null;

  return {
    loja: feed.loja,
    id_externo: `${feed.prefixo}${id}`,
    titulo,
    preco_atual: Math.round(atual * 100) / 100,
    preco_antigo: antigo && antigo > atual ? Math.round(antigo * 100) / 100 : null,
    link,
    imagem: linha.merchant_image_url || linha.image_url || linha.aw_image_url || linha.large_image || null,
    _pagina: pagina,
    _desconto: antigo && antigo > atual ? Math.round(((antigo - atual) / antigo) * 100) : 0,
    _categoria: classificar(titulo, feed.loja),
  };
}

function passaNosFiltros(o) {
  if (!o || !o._categoria || !o.preco_antigo) return false;
  if (o.preco_atual <= ajuste("awin_preco_minimo")) return false;
  if (o._desconto >= DESCONTO_MAXIMO) return false;
  return o._desconto >= descontoMinimoDa(o._categoria);
}

const banco = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;

// Mesma chave que o banco usa no histórico (função chave_do_produto)
const chaveDoProduto = (o) => `id:${o.loja.toLowerCase()}|${o.id_externo}`;

// Grava o preço de hoje de todos os produtos do feed (em lotes)
async function gravarHistorico(db, produtos) {
  let total = 0;
  for (let i = 0; i < produtos.length; i += 1000) {
    const lote = produtos.slice(i, i + 1000).map((o) => ({
      loja: o.loja,
      id_externo: o.id_externo,
      titulo: o.titulo,
      preco: o.preco_atual,
    }));
    const { data, error } = await db.rpc("registrar_precos_feed", { itens: lote });
    if (error) throw new Error(`histórico: ${error.message} (rodou o historico-feed.sql no Supabase?)`);
    total += data ?? 0;
  }
  return total;
}

// Preço normal (mediana dos últimos dias) de cada produto
async function precosNormais(db, produtos) {
  const mapa = new Map();
  for (let i = 0; i < produtos.length; i += 1000) {
    const chaves = produtos.slice(i, i + 1000).map(chaveDoProduto);
    const { data, error } = await db.rpc("precos_de_referencia", {
      chaves,
      dias: DIAS_HISTORICO,
      minimo_dias: DIAS_MINIMOS_HISTORICO,
    });
    if (error) throw new Error(`histórico: ${error.message}`);
    for (const r of data ?? []) mapa.set(r.chave, Number(r.referencia));
  }
  return mapa;
}

// ---------- Leitura do preço "de" na página da loja ----------
const NAVEGADOR = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9",
  Accept: "text/html,application/xhtml+xml",
};

const reais = (t) => numero(String(t).replace(/&nbsp;| /g, " "));

// Procura o preço riscado no HTML da página (KaBuM! e lojas parecidas)
export function lerPrecoDe(html) {
  // dados da página em JSON: "oldPrice": 144.43
  const json = [
    /"oldPrice"\s*:\s*"?(\d+(?:\.\d+)?)/i,
    /"listPrice"\s*:\s*"?(\d+(?:\.\d+)?)/i,
    /"originalPrice"\s*:\s*"?(\d+(?:\.\d+)?)/i,
    /"priceFrom"\s*:\s*"?(\d+(?:\.\d+)?)/i,
  ];
  for (const re of json) {
    const m = html.match(re);
    if (m && Number(m[1]) > 0) return Number(m[1]);
  }
  // no HTML: elemento com "oldPrice" na classe, ou texto "De R$ 144,43"
  const htmlPadroes = [
    /class="[^"]*old[-_]?price[^"]*"[^>]*>(?:\s*<[^>]+>)*\s*R\$(?:\s|&nbsp;| )*([\d.]+,\d{2})/i,
    /<(?:s|del|strike)\b[^>]*>(?:\s*<[^>]+>)*\s*R\$(?:\s|&nbsp;| )*([\d.]+,\d{2})/i,
    />\s*De:?\s*R\$(?:\s|&nbsp;| )*([\d.]+,\d{2})/i,
  ];
  for (const re of htmlPadroes) {
    const m = html.match(re);
    if (m) return reais(m[1]);
  }
  return null;
}

async function abrirPagina(url) {
  try {
    const r = await fetch(url, { headers: NAVEGADOR, redirect: "follow", signal: AbortSignal.timeout(15000) });
    const html = await r.text();
    if ([403, 429, 503].includes(r.status) || /just a moment|cf-chl|captcha|access denied/i.test(html.slice(0, 5000)))
      return { bloqueado: true };
    if (!r.ok) return { erro: `HTTP ${r.status}` };
    return { html };
  } catch (e) {
    return { erro: e.name === "TimeoutError" ? "demorou demais" : e.message };
  }
}

// Só aceita se for maior que o preço atual e o desconto for plausível
const plausivel = (de, atual) => de > atual && (de - atual) / de >= 0.05 && (de - atual) / de < DESCONTO_MAXIMO / 100;

// Lê (ou pega da memória) o preço "de" das páginas dos produtos que não têm preço "de" no feed
async function precosDasPaginas(db, produtos, loja) {
  const resumo = { "da memória": 0, lidas: 0, "com preço de": 0, "sem preço de": 0, bloqueadas: 0, erros: 0 };
  const candidatos = produtos.filter(
    (o) => !o.preco_antigo && o._pagina && o._categoria && o.preco_atual > ajuste("awin_preco_minimo")
  );
  if (!candidatos.length) return resumo;

  // 1) O que já foi lido nas últimas horas
  const memoria = new Map();
  const ids = candidatos.map((o) => o.id_externo);
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db
      .from("precos_pagina")
      .select("id_externo, preco_de, conferido_em")
      .in("id_externo", ids.slice(i, i + 200));
    if (error) throw new Error(`precos_pagina: ${error.message} (rodou o kabum-paginas.sql no Supabase?)`);
    for (const r of data ?? []) memoria.set(r.id_externo, r);
  }
  const limite = Date.now() - HORAS_ENTRE_LEITURAS * 3600 * 1000;
  const aplicar = (o, de) => {
    if (!plausivel(de, o.preco_atual)) return false;
    o.preco_antigo = Math.round(de * 100) / 100;
    o._desconto = Math.round(((de - o.preco_atual) / de) * 100);
    o._fonte = "página";
    return true;
  };

  const paraLer = [];
  for (const o of candidatos) {
    const m = memoria.get(o.id_externo);
    if (m && new Date(m.conferido_em).getTime() > limite) {
      if (m.preco_de && aplicar(o, Number(m.preco_de))) resumo["da memória"]++;
    } else paraLer.push(o);
  }

  // 2) Lê as páginas que faltam: tecnologia primeiro, depois as mais caras
  paraLer.sort(
    (a, b) =>
      Number(CATEGORIAS_TECNOLOGIA?.has?.(b._categoria) ?? 0) - Number(CATEGORIAS_TECNOLOGIA?.has?.(a._categoria) ?? 0) ||
      b.preco_atual - a.preco_atual
  );
  const fila = paraLer.slice(0, Math.max(0, ajuste("awin_paginas_por_execucao")));
  const gravar = [];
  let bloqueiosSeguidos = 0;
  let parar = false;

  async function trabalhador() {
    while (fila.length && !parar) {
      const o = fila.shift();
      const { html, bloqueado, erro } = await abrirPagina(o._pagina);
      if (bloqueado) {
        resumo.bloqueadas++;
        if (++bloqueiosSeguidos >= BLOQUEIOS_PARA_PARAR) parar = true;
        continue;
      }
      if (erro) {
        resumo.erros++;
        continue;
      }
      bloqueiosSeguidos = 0;
      resumo.lidas++;
      const de = lerPrecoDe(html);
      if (de && aplicar(o, de)) resumo["com preço de"]++;
      else resumo["sem preço de"]++;
      gravar.push({
        id_externo: o.id_externo,
        loja,
        preco_de: de,
        preco_no_feed: o.preco_atual,
        conferido_em: new Date().toISOString(),
      });
    }
  }
  await Promise.all(Array.from({ length: PAGINAS_AO_MESMO_TEMPO }, trabalhador));
  if (parar) console.warn(`[awin] ${loja} bloqueou a leitura das páginas: usando só o histórico desta vez.`);

  for (let i = 0; i < gravar.length; i += 500) {
    const { error } = await db.from("precos_pagina").upsert(gravar.slice(i, i + 500), { onConflict: "id_externo" });
    if (error) console.warn(`[awin] Não consegui guardar as páginas lidas: ${error.message}`);
  }
  resumo["faltam ler"] = paraLer.length - resumo.lidas - resumo.bloqueadas - resumo.erros;
  return resumo;
}

// Baixa o feed só de X em X horas (o horário de agora decide; o robô roda a cada 30 min)
function horaDeBaixar() {
  const horas = Math.max(1, ajuste("awin_horas_entre_downloads"));
  const agora = new Date();
  return agora.getUTCHours() % horas === 0 && agora.getUTCMinutes() < 30;
}

async function buscarExistentes(loja, ids) {
  const mapa = new Map();
  if (!ids.length || !process.env.SUPABASE_SERVICE_ROLE_KEY) return mapa;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db
      .from("ofertas")
      .select("id_externo, publicada_em")
      .eq("loja", loja)
      .in("id_externo", ids.slice(i, i + 200));
    for (const o of data ?? []) mapa.set(o.id_externo, o);
  }
  return mapa;
}

// Escolhe as melhores, sem repetir categoria demais
function escolher(candidatos, maximo) {
  const porCategoria = new Map();
  const escolhidas = [];
  for (const o of candidatos.sort((a, b) => b._desconto - a._desconto)) {
    const n = porCategoria.get(o._categoria) ?? 0;
    if (n >= MAX_POR_CATEGORIA) continue;
    porCategoria.set(o._categoria, n + 1);
    escolhidas.push(o);
    if (escolhidas.length >= maximo) break;
  }
  return escolhidas;
}

// ---------- Função usada pelo coletar.mjs ----------
export async function buscar({ forcar = false } = {}) {
  if (!ajuste("awin_ativo")) {
    console.log("[awin] Desligada no painel admin: pulando.");
    return [];
  }
  const feeds = feedsConfigurados();
  if (!feeds.length) {
    console.log("[awin] Nenhum feed configurado (AWIN_FEED_KABUM): pulando.");
    return [];
  }
  if (!forcar && !horaDeBaixar()) {
    console.log(`[awin] Fora do horário de download (a cada ${ajuste("awin_horas_entre_downloads")}h): pulando.`);
    return [];
  }

  const agora = new Date().toISOString();
  const itens = [];
  for (const feed of feeds) {
    try {
      const linhas = await baixarFeed(process.env[feed.variavel]);
      const produtos = linhas.map((l) => converter(l, feed)).filter(Boolean);

      const db = banco();
      if (db) {
        // 1) grava o preço de hoje de todos os produtos (histórico)
        const gravados = await gravarHistorico(db, produtos);

        // 2) preço "de" lido na página da loja
        if (ajuste("awin_ler_paginas")) {
          try {
            const r = await precosDasPaginas(db, produtos, feed.loja);
            console.log(`[awin] ${feed.loja}: páginas →`, JSON.stringify(r));
          } catch (e) {
            console.warn(`[awin] Leitura das páginas falhou: ${e.message}`);
          }
        }

        // 3) quem continua sem preço "de": compara com o preço normal do histórico
        const semPrecoDe = produtos.filter((o) => !o.preco_antigo);
        const normais = semPrecoDe.length ? await precosNormais(db, semPrecoDe) : new Map();
        for (const o of semPrecoDe) {
          const normal = normais.get(chaveDoProduto(o));
          if (normal && normal > o.preco_atual) {
            o.preco_antigo = Math.round(normal * 100) / 100;
            o._desconto = Math.round(((normal - o.preco_atual) / normal) * 100);
            o._fonte = "histórico";
          }
        }
        console.log(
          `[awin] ${feed.loja}: ${gravados} preços gravados no histórico; ${normais.size} produtos já têm ` +
            `${DIAS_MINIMOS_HISTORICO}+ dias de histórico para comparar.`
        );
      }

      const bons = produtos.filter(passaNosFiltros);
      const escolhidas = escolher(bons, ajuste("awin_max_por_execucao"));
      console.log(`[awin] ${feed.loja}: ${linhas.length} produtos no feed, ${bons.length} com desconto, ${escolhidas.length} escolhidos.`);

      const existentes = await buscarExistentes(feed.loja, escolhidas.map((o) => o.id_externo));
      for (const { _desconto, _categoria, _pagina, _fonte, ...o } of escolhidas) {
        itens.push({
          ...o,
          categoria: _categoria,
          publicada_em: existentes.get(o.id_externo)?.publicada_em ?? agora,
        });
      }
    } catch (erro) {
      console.warn(`[awin] Falha no feed da ${feed.loja}: ${erro.message}`);
    }
  }
  return itens;
}
