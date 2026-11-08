// Lê as variáveis do .env.local do site (pasta de cima) e de um .env desta pasta, se existir.
// Não sobrescreve variáveis que já estão no ambiente (útil na VPS).
import fs from "node:fs";
import path from "node:path";

export function carregarEnv(pastaVideo) {
  const arquivos = [
    path.join(pastaVideo, ".env"),
    path.join(pastaVideo, "..", ".env.local"),
    path.join(pastaVideo, "..", ".env.robo"),
  ];
  const lidos = [];
  for (const arq of arquivos) {
    if (!fs.existsSync(arq)) continue;
    lidos.push(path.basename(arq));
    for (const linha of fs.readFileSync(arq, "utf8").split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  }
  return lidos;
}

// Aceita alguns nomes comuns para a mesma chave
export function pegar(...nomes) {
  for (const n of nomes) if (process.env[n]) return process.env[n];
  return "";
}
