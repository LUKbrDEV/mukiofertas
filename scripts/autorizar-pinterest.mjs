// Rode UMA VEZ no seu PC para o robô ganhar permissão de criar pins na sua conta do Pinterest.
// Mostra o PINTEREST_ACCESS_TOKEN e o PINTEREST_REFRESH_TOKEN para você colar na VPS.
//
//   node scripts/autorizar-pinterest.mjs SEU_APP_ID SEU_APP_SECRET
//
// Antes, no app em developers.pinterest.com, cadastre este endereço em "Redirect URIs":
//   http://localhost:8766/
import http from "node:http";
import { exec } from "node:child_process";

const APP_ID = process.argv[2] || process.env.PINTEREST_APP_ID;
const APP_SECRET = process.argv[3] || process.env.PINTEREST_APP_SECRET;
const PORTA = 8766;
const VOLTA = `http://localhost:${PORTA}/`;
const API = process.env.PINTEREST_SANDBOX === "1" ? "https://api-sandbox.pinterest.com/v5" : "https://api.pinterest.com/v5";

if (!APP_ID || !APP_SECRET) {
  console.error("Uso: node scripts/autorizar-pinterest.mjs SEU_APP_ID SEU_APP_SECRET");
  process.exit(1);
}

const url =
  "https://www.pinterest.com/oauth/?" +
  new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: VOLTA,
    response_type: "code",
    scope: "boards:read,boards:write,pins:read,pins:write,user_accounts:read",
    state: "mukiofertas",
  });

const servidor = http.createServer(async (req, res) => {
  const params = new URL(req.url, VOLTA).searchParams;
  const codigo = params.get("code");
  if (!codigo) {
    res.end(params.get("error") ? `Erro: ${params.get("error")}` : "Aguardando...");
    return;
  }
  const r = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${APP_ID}:${APP_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code: codigo, redirect_uri: VOLTA }),
  });
  const j = await r.json();
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  if (j.access_token) {
    res.end("<h2>Pronto! Pode fechar esta aba e voltar ao terminal.</h2>");
    console.log("\nCole estas linhas no ~/robo.env e no ~/mukiofertas-robo/.env.robo da VPS:\n");
    console.log(`PINTEREST_APP_ID=${APP_ID}`);
    console.log(`PINTEREST_APP_SECRET=${APP_SECRET}`);
    console.log(`PINTEREST_ACCESS_TOKEN=${j.access_token}`);
    console.log(`PINTEREST_REFRESH_TOKEN=${j.refresh_token}\n`);
  } else {
    res.end("<h2>Não deu certo. Veja o terminal.</h2>");
    console.error("Resposta do Pinterest:", j);
  }
  servidor.close();
});

servidor.listen(PORTA, () => {
  console.log("Abrindo o login do Pinterest. Se não abrir, copie e cole no navegador:\n");
  console.log(url + "\n");
  const abrir = process.platform === "win32" ? `start "" "${url}"` : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  exec(abrir, () => {});
});
