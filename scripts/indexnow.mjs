// Avisa o Bing (e outros buscadores do IndexNow) sobre páginas novas ou atualizadas do site.
// Lê o sitemap.xml do site no ar, compara com o que já foi enviado antes e manda só o que mudou.
// O sitemap já segue a regra de lib/indexacao.js, então só vão páginas que devem ser indexadas.
//
// Rodar:  node scripts/indexnow.mjs
// Na VPS, agende de hora em hora (crontab -e):
//   15 * * * * cd /home/ubuntu/mukiofertas-robo && node scripts/indexnow.mjs >> logs-indexnow.txt 2>&1

import { readFile, writeFile } from "node:fs/promises";

const SITE = "https://www.mukiofertas.com.br";
const HOST = "www.mukiofertas.com.br";
const KEY = "79d9ac811ebf7cb3f9739c5d4f8df3be";
const KEY_LOCATION = `${SITE}/${KEY}.txt`;
const ESTADO = new URL("./.indexnow-enviados.json", import.meta.url);
const LOTE = 10000; // máximo de URLs por envio no IndexNow

async function lerEstado() {
  try {
    return JSON.parse(await readFile(ESTADO, "utf8"));
  } catch {
    return {}; // primeira vez: envia tudo
  }
}

async function lerSitemap() {
  const res = await fetch(`${SITE}/sitemap.xml`, { headers: { "User-Agent": "MukiOfertas-IndexNow" } });
  if (!res.ok) throw new Error(`Não consegui ler o sitemap (HTTP ${res.status})`);
  const xml = await res.text();
  const paginas = [];
  for (const bloco of xml.match(/<url>[\s\S]*?<\/url>/g) ?? []) {
    const loc = bloco.match(/<loc>(.*?)<\/loc>/)?.[1]?.trim();
    const lastmod = bloco.match(/<lastmod>(.*?)<\/lastmod>/)?.[1]?.trim() ?? "";
    if (loc) paginas.push({ loc, lastmod });
  }
  return paginas;
}

async function enviar(urlList) {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
  });
  // 200 e 202 = recebido. 403 = arquivo da chave não encontrado. 422 = URL de outro domínio. 429 = envios demais.
  if (res.status !== 200 && res.status !== 202) {
    throw new Error(`IndexNow respondeu ${res.status}: ${await res.text()}`);
  }
  return res.status;
}

const estado = await lerEstado();
const paginas = await lerSitemap();

// Só as páginas novas ou com data de atualização diferente da última vez
const mudaram = paginas.filter((p) => estado[p.loc] !== p.lastmod);

if (mudaram.length === 0) {
  console.log(new Date().toISOString(), "Nada novo para enviar.");
} else {
  for (let i = 0; i < mudaram.length; i += LOTE) {
    const lote = mudaram.slice(i, i + LOTE);
    const status = await enviar(lote.map((p) => p.loc));
    for (const p of lote) estado[p.loc] = p.lastmod;
    console.log(new Date().toISOString(), `Enviadas ${lote.length} páginas (HTTP ${status}).`);
  }
  // Esquece páginas que saíram do sitemap, para o arquivo não crescer para sempre
  const noSitemap = new Set(paginas.map((p) => p.loc));
  for (const loc of Object.keys(estado)) if (!noSitemap.has(loc)) delete estado[loc];
  await writeFile(ESTADO, JSON.stringify(estado));
}
