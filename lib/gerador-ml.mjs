// Gerador OFICIAL de links de afiliado do Mercado Livre (o mesmo botão "Gerar" do painel de Afiliados).
// Salve como lib/gerador-ml.mjs
//
// Por que existe: o link montado à mão (produto + matt_word/matt_tool) não está sendo contado pelo
// Mercado Livre (os cliques caíram de 40-50 para 3-5 por dia quando o robô passou a usar ele).
// O link que conta é o meli.la que o gerador do painel cria.
//
// O Mercado Livre não tem API pública para isso: usamos a SUA sessão logada (cookie do navegador).
//   .env.robo (VPS; o site não precisa):  ML_AFILIADO_COOKIE="cole aqui o valor do cookie"
// Quando a sessão expira, o gerador avisa (SessaoMLExpirada) e a Saúde do robô no painel fica vermelha:
// é só pegar o cookie de novo (passo a passo no topo do scripts/converter-links-ml.mjs).

const ENDPOINT = "https://www.mercadolivre.com.br/affiliate-program/api/v2/affiliates/linkbuilder/createLink";
const ETIQUETA = (process.env.ML_ETIQUETA || process.env.ML_MATT_WORD || "salu8855060").toLowerCase();
const POR_CHAMADA = 10; // URLs por chamada ao gerador
const PAUSA_MS = 1500; // entre uma chamada e outra (para não parecer robô)
const TEMPO_LIMITE_MS = 20000;

export class SessaoMLExpirada extends Error {
  constructor(detalhe = "") {
    super(`Sessão do Mercado Livre expirada ou inválida${detalhe ? ` (${detalhe})` : ""}: pegue o cookie de novo (ML_AFILIADO_COOKIE).`);
    this.name = "SessaoMLExpirada";
  }
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Link do produto limpo, do jeito que o gerador aceita (sem matt_word, tracking etc.)
export function urlLimpaML(endereco) {
  try {
    const u = new URL(String(endereco).trim());
    if (!/(^|\.)mercadoli(vre|bre)\.com(\.br)?$/i.test(u.hostname)) return null;
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

export function ehLinkOficialML(link) {
  return /^https:\/\/meli\.la\/[A-Za-z0-9]+$/.test(String(link ?? "").trim());
}

export function temSessaoML() {
  return Boolean(String(process.env.ML_AFILIADO_COOKIE ?? "").trim());
}

async function chamar(urls, cookie) {
  let r;
  try {
    r = await fetch(ENDPOINT, {
      method: "POST",
      redirect: "manual",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        cookie,
        origin: "https://www.mercadolivre.com.br",
        referer: "https://www.mercadolivre.com.br/afiliados/linkbuilder",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
        "accept-language": "pt-BR,pt;q=0.9",
      },
      body: JSON.stringify({ urls, tag: ETIQUETA }),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
  } catch (e) {
    throw new Error(`gerador do ML não respondeu: ${e.message}`);
  }
  if (r.status === 401 || r.status === 403 || (r.status >= 300 && r.status < 400)) throw new SessaoMLExpirada(`HTTP ${r.status}`);
  const texto = await r.text();
  let json;
  try {
    json = JSON.parse(texto);
  } catch {
    // página de login/verificação no lugar do JSON
    throw new SessaoMLExpirada(`resposta não é JSON (HTTP ${r.status})`);
  }
  if (!r.ok || !Array.isArray(json?.urls)) {
    if (/login|unauthori|forbidden|session/i.test(texto)) throw new SessaoMLExpirada(`HTTP ${r.status}`);
    throw new Error(`gerador do ML respondeu ${r.status}: ${texto.slice(0, 150)}`);
  }
  return json.urls;
}

// Recebe links de produto do ML; devolve Map(link recebido → { link: "https://meli.la/..." } ou { erro })
// Lança SessaoMLExpirada se a sessão não vale mais (aí não adianta continuar).
export async function gerarLinksOficiaisML(links, { cookie = process.env.ML_AFILIADO_COOKIE } = {}) {
  const sessao = String(cookie ?? "").trim();
  if (!sessao) throw new SessaoMLExpirada("ML_AFILIADO_COOKIE não configurado");

  const resultado = new Map();
  const pendentes = [];
  for (const original of links) {
    const limpa = urlLimpaML(original);
    if (!limpa) resultado.set(original, { erro: "não é link do Mercado Livre" });
    else pendentes.push({ original, limpa });
  }

  for (let i = 0; i < pendentes.length; i += POR_CHAMADA) {
    const lote = pendentes.slice(i, i + POR_CHAMADA);
    if (i > 0) await esperar(PAUSA_MS);
    const respostas = await chamar(
      lote.map((p) => p.limpa),
      sessao
    );
    lote.forEach((p, n) => {
      const resp = respostas.find((x) => x?.origin_url === p.limpa) ?? respostas[n];
      if (resp?.short_url && ehLinkOficialML(resp.short_url)) resultado.set(p.original, { link: resp.short_url });
      else resultado.set(p.original, { erro: String(resp?.message || resp?.error || "o gerador não devolveu link").slice(0, 120) });
    });
  }
  return resultado;
}
