// Confere o preço das ofertas que NÃO vêm da Lomadee (as do canal do Telegram e as cadastradas
// à mão), lendo a página do produto na loja. Mesma regra da Lomadee (lib/prazos.mjs):
//   - conferência a cada HORAS_ENTRE_CONFERENCIAS horas para cada oferta
//   - subiu mais de TOLERANCIA_PERCENTUAL %: a oferta fica como Expirada
//   - subiu até a tolerância ou caiu: grava o preço novo
//   - perto de expirar com o preço mantido: ganha mais dias (renovação)
//
// A Amazon fica de fora: o contrato do Amazon Associates proíbe ler as páginas de forma automática.
// As ofertas da Amazon continuam expirando só pelo prazo normal.
//
// Salve como scripts/conferir-precos.mjs. Rodar na mão:
//   node --env-file=.env.local scripts/conferir-precos.mjs            (grava no banco)
//   node --env-file=.env.local scripts/conferir-precos.mjs --teste    (só mostra, não grava)
//   node --env-file=.env.local scripts/conferir-precos.mjs --debug    (não grava e mostra o que a loja devolveu)

import { createClient } from "@supabase/supabase-js";
import {
  DIAS_NO_SITE,
  HORAS_ENTRE_CONFERENCIAS,
  TOLERANCIA_PERCENTUAL,
  precoSubiu,
  horaDeConferir,
  podeRenovar,
  camposDaRenovacao,
  aplicarConfigDoBanco,
  registrarExecucao,
} from "../lib/prazos.mjs";

// ===== AJUSTES =====
const MAX_POR_EXECUCAO = 60; // quantas ofertas conferir por vez (o resto fica para a próxima)
const PAUSA_MS = 1500; // pausa entre uma loja e outra, para não ser bloqueado
// Lojas que não podem ser conferidas automaticamente
const DOMINIOS_IGNORADOS = [/amazon\./i, /amzn\./i, /amaznlink/i, /\ba\.co\//i];
// ===================

const teste = process.argv.includes("--teste") || process.argv.includes("--debug");
const debug = process.argv.includes("--debug"); // mostra o que a loja devolveu (para diagnóstico)
let detalhesDebug = 0;
const NAVEGADOR = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9",
  Accept: "text/html,application/xhtml+xml",
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Leitura do preço na página ----------
function numero(valor) {
  if (valor === null || valor === undefined) return null;
  let t = String(valor).trim().replace(/[^\d.,]/g, "");
  if (!t) return null;
  // "1.299,90" -> 1299.90 | "1299.90" -> 1299.90 | "1299,90" -> 1299.90
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function precoNoJsonLd(html) {
  const blocos = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const bloco of blocos) {
    const texto = bloco.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
    let dados;
    try {
      dados = JSON.parse(texto);
    } catch {
      continue;
    }
    const fila = Array.isArray(dados) ? [...dados] : [dados];
    while (fila.length) {
      const item = fila.shift();
      if (!item || typeof item !== "object") continue;
      if (Array.isArray(item["@graph"])) fila.push(...item["@graph"]);
      const tipo = [].concat(item["@type"] ?? []).join(",");
      if (/Product/i.test(tipo) && item.offers) {
        const ofertas = [].concat(item.offers);
        for (const o of ofertas) {
          const p = numero(o.price ?? o.lowPrice);
          if (p) return p;
        }
      }
    }
  }
  return null;
}

function precoNasMetas(html) {
  const padroes = [
    /<meta[^>]+(?:property|name)=["'](?:product:price:amount|og:price:amount)["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:product:price:amount|og:price:amount)["']/i,
    /itemprop=["']price["'][^>]+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]+itemprop=["']price["']/i,
  ];
  for (const re of padroes) {
    const m = html.match(re);
    const p = m && numero(m[1]);
    if (p) return p;
  }
  return null;
}

// Mercado Livre e outras lojas guardam o preço também em dados dentro da página
function precoEmbutido(html) {
  const padroes = [
    /"price"\s*:\s*\{\s*"type"\s*:\s*"price"\s*,\s*"value"\s*:\s*([\d.]+)/i,
    /"current_price"\s*:\s*\{[^}]*?"value"\s*:\s*([\d.]+)/i,
    /"price"\s*:\s*\{\s*"value"\s*:\s*([\d.]+)/i,
    /"amount"\s*:\s*([\d.]+)\s*,\s*"currency_id"\s*:\s*"BRL"/i,
  ];
  for (const re of padroes) {
    const m = html.match(re);
    const p = m && Number(m[1]);
    if (p && p > 0) return p;
  }
  return null;
}

const lerPreco = (html) => precoNoJsonLd(html) ?? precoNasMetas(html) ?? precoEmbutido(html);

function mostrarDebug(rotulo, pagina) {
  if (!debug || detalhesDebug >= 6) return;
  detalhesDebug++;
  const titulo = (pagina.html.match(/<title[^>]*>([^<]*)/i)?.[1] ?? "").trim().slice(0, 90);
  const bloqueio = /captcha|account-verification|suspicious|robot|unusual traffic|security check/i.test(pagina.html);
  const trecho = pagina.html.match(/.{0,60}(?:price|preço|preco).{0,80}/i)?.[0] ?? "(nenhum trecho com 'price')";
  console.log(`      [debug ${rotulo}] status ${pagina.status} | ${pagina.html.length} caracteres | título: "${titulo}"`);
  console.log(`      [debug ${rotulo}] endereço final: ${pagina.url.slice(0, 140)}`);
  console.log(`      [debug ${rotulo}] parece bloqueio/captcha: ${bloqueio ? "SIM" : "não"}`);
  console.log(`      [debug ${rotulo}] trecho: ${trecho.replace(/\s+/g, " ").slice(0, 160)}`);
}

async function abrir(url) {
  const res = await fetch(url, { redirect: "follow", headers: NAVEGADOR });
  const html = await res.text();
  return { status: res.status, url: res.url || url, html };
}

// Mercado Livre: o link de afiliado (meli.la) abre uma página intermediária;
// o código do anúncio está nela, e com ele abrimos a página do produto.
function codigoML(texto) {
  const doItem = texto.match(/[?&#;](?:item_id|wid)=MLB-?(\d{6,})/i);
  if (doItem) return { tipo: "item", num: doItem[1] };
  const doCatalogo = texto.match(/\/p\/MLB(\d{6,})/i);
  if (doCatalogo) return { tipo: "produto", num: doCatalogo[1] };
  const doAnuncio = texto.match(/MLB-?(\d{8,})/i);
  if (doAnuncio) return { tipo: "item", num: doAnuncio[1] };
  return null;
}

async function precoAtualDaLoja(link) {
  const pagina = await abrir(link);
  if (pagina.status >= 400) return { erro: `a loja respondeu ${pagina.status}` };

  let preco = lerPreco(pagina.html);
  if (!preco) mostrarDebug("link", pagina);

  const ehML = /mercadoli[vb]re|meli\.la/i.test(pagina.url) || /meli\.la/i.test(link);
  if (!preco && ehML) {
    const cod = codigoML(pagina.url) ?? codigoML(pagina.html);
    if (cod) {
      const url =
        cod.tipo === "produto"
          ? `https://www.mercadolivre.com.br/p/MLB${cod.num}`
          : `https://produto.mercadolivre.com.br/MLB-${cod.num}`;
      await esperar(500);
      const produto = await abrir(url);
      if (produto.status >= 400) return { erro: `o Mercado Livre respondeu ${produto.status}` };
      preco = lerPreco(produto.html);
      if (!preco) mostrarDebug("produto", produto);
    }
  }

  return preco ? { preco } : { erro: "preço não encontrado na página" };
}

// ---------- Execução ----------
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Tolerância, intervalo entre conferências, renovação e pausa vêm do painel admin (aba Configurações)
const config = await aplicarConfigDoBanco(supabase);
if (config.conferencia_pausada) {
  console.log("Conferência de preços pausada no painel admin (aba Configurações). Nada foi feito.");
  if (!teste) await registrarExecucao(supabase, "conferir-precos", true, "Pausada no painel admin");
  process.exit(0);
}

const agora = new Date();
const agoraIso = agora.toISOString();
const corte = new Date(agora.getTime() - DIAS_NO_SITE * 86400000).toISOString();

const { data, error } = await supabase
  .from("ofertas")
  .select("id, titulo, loja, link, ativa, oculta_manual, publicada_em, expires_at, preco_atual, preco_antigo, preco_conferido_em, renovacoes, id_externo")
  .eq("ativa", true)
  .not("id_externo", "like", "lmd-%") // as da Lomadee são conferidas pelo coletar.mjs
  .not("id_externo", "like", "shp-%") // as da Shopee (API) também
  .or(`expires_at.is.null,expires_at.gt.${agoraIso}`)
  .gt("publicada_em", corte)
  .order("preco_conferido_em", { ascending: true, nullsFirst: true })
  .limit(1000);

if (error) {
  console.error("Erro ao buscar ofertas:", error.message);
  if (!teste) await registrarExecucao(supabase, "conferir-precos", false, `Erro: ${error.message}`);
  process.exit(1);
}

const pendentes = (data ?? [])
  .filter((o) => o.link && !DOMINIOS_IGNORADOS.some((re) => re.test(o.link) || re.test(o.loja ?? "")))
  .filter((o) => horaDeConferir(o, agora.getTime()))
  .slice(0, MAX_POR_EXECUCAO);

console.log(
  `\n${pendentes.length} ofertas para conferir agora (a cada ${HORAS_ENTRE_CONFERENCIAS}h, tolerância de ${TOLERANCIA_PERCENTUAL}%).` +
    (teste ? " Modo teste: nada será gravado." : "") +
    "\n"
);

const resumo = { mantidas: 0, baixaram: 0, expiradas: 0, renovadas: 0, semPreco: 0 };
const falhasPorLoja = {};

for (const o of pendentes) {
  let resultado;
  try {
    resultado = await precoAtualDaLoja(o.link);
  } catch (erro) {
    resultado = { erro: erro.message };
  }

  const atual = Number(o.preco_atual);
  let novo = resultado.preco;

  // Leitura duvidosa (ex.: pegou o valor da parcela): ignora em vez de expirar por engano
  if (novo && (novo < atual * 0.3 || novo > atual * 3)) {
    resultado = { erro: `preço lido (R$ ${novo}) muito diferente do salvo (R$ ${atual}), ignorado` };
    novo = null;
  }

  const campos = { preco_conferido_em: agoraIso };
  let acao;

  if (!novo) {
    resumo.semPreco++;
    falhasPorLoja[o.loja] = (falhasPorLoja[o.loja] ?? 0) + 1;
    acao = `sem preço (${resultado.erro})`;
  } else if (precoSubiu(atual, novo)) {
    campos.expires_at = agoraIso;
    resumo.expiradas++;
    acao = `EXPIRADA: subiu de R$ ${atual} para R$ ${novo}`;
  } else {
    if (novo < atual) {
      campos.preco_atual = novo;
      resumo.baixaram++;
      acao = `baixou de R$ ${atual} para R$ ${novo}`;
    } else {
      resumo.mantidas++;
      acao = `mantida (R$ ${novo})`;
    }
    if (podeRenovar(o, novo, agora.getTime())) {
      Object.assign(campos, camposDaRenovacao(o, agora));
      resumo.renovadas++;
      acao += " + renovada";
    }
  }

  console.log(`  [${o.loja}] ${String(o.titulo).slice(0, 70)} -> ${acao}`);

  if (!teste) {
    const { error: erroGravar } = await supabase.from("ofertas").update(campos).eq("id", o.id);
    if (erroGravar) console.error(`    erro ao gravar: ${erroGravar.message}`);
  }

  await esperar(PAUSA_MS);
}

console.log(
  `\nConferência concluída: ${resumo.mantidas} mantidas, ${resumo.baixaram} com preço menor, ` +
    `${resumo.expiradas} expiradas, ${resumo.renovadas} renovadas, ${resumo.semPreco} sem preço.`
);
if (Object.keys(falhasPorLoja).length) {
  console.log("Lojas em que não foi possível ler o preço:", falhasPorLoja);
}
if (!teste) {
  await registrarExecucao(
    supabase,
    "conferir-precos",
    true,
    `${pendentes.length} conferidas: ${resumo.mantidas} mantidas, ${resumo.baixaram} baixaram, ` +
      `${resumo.expiradas} expiradas, ${resumo.renovadas} renovadas, ${resumo.semPreco} sem preço`
  );
}
console.log("");
