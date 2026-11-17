// Rode UMA VEZ no seu PC para o robô ganhar permissão de postar no canal do YouTube.
// Ele abre o login do Google e mostra o YOUTUBE_REFRESH_TOKEN para você colar na VPS.
//
//   cd video-social
//   node autorizar-youtube.mjs SEU_CLIENT_ID SEU_CLIENT_SECRET
//
// (ou coloque YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET no .env.local e rode sem nada)
// O cliente OAuth no Google Cloud precisa ser do tipo "App para computador" (Desktop).
import http from "node:http";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { carregarEnv, pegar } from "./lib/env.mjs";

carregarEnv(path.dirname(fileURLToPath(import.meta.url)));
const CLIENT_ID = process.argv[2] || pegar("YOUTUBE_CLIENT_ID");
const CLIENT_SECRET = process.argv[3] || pegar("YOUTUBE_CLIENT_SECRET");
const PORTA = 8765;
const VOLTA = `http://127.0.0.1:${PORTA}`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Uso: node autorizar-youtube.mjs SEU_CLIENT_ID SEU_CLIENT_SECRET");
  process.exit(1);
}

const url =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: VOLTA,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/youtube.upload",
    access_type: "offline",
    prompt: "consent",
  });

const servidor = http.createServer(async (req, res) => {
  const codigo = new URL(req.url, VOLTA).searchParams.get("code");
  const erro = new URL(req.url, VOLTA).searchParams.get("error");
  if (!codigo) {
    res.end(erro ? `Erro: ${erro}` : "Aguardando...");
    if (erro) { console.error("O Google recusou:", erro); servidor.close(); }
    return;
  }
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code: codigo, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: VOLTA, grant_type: "authorization_code" }),
  });
  const j = await r.json();
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  if (j.refresh_token) {
    res.end("<h2>Pronto! Pode fechar esta aba e voltar ao terminal.</h2>");
    console.log("\nCole estas 3 linhas no ~/robo.env e no ~/mukiofertas-robo/.env.robo da VPS:\n");
    console.log(`YOUTUBE_CLIENT_ID=${CLIENT_ID}`);
    console.log(`YOUTUBE_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`YOUTUBE_REFRESH_TOKEN=${j.refresh_token}\n`);
  } else {
    res.end("<h2>Não veio o refresh token. Veja o terminal.</h2>");
    console.error("Resposta do Google:", j);
  }
  servidor.close();
});

servidor.listen(PORTA, "127.0.0.1", () => {
  console.log("Abrindo o login do Google. Se não abrir, copie e cole no navegador:\n");
  console.log(url + "\n");
  const abrir = process.platform === "win32" ? `start "" "${url}"` : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  exec(abrir, () => {});
});
