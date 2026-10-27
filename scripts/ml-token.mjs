// Conecta o MukiOfertas à API do Mercado Livre (é preciso fazer só uma vez).
// Salve como scripts/ml-token.mjs e rode na raiz do projeto.
//
// Precisa no .env.local:
//   ML_CLIENT_ID=...        (Client ID / App ID do seu app no Mercado Livre)
//   ML_CLIENT_SECRET=...    (Secret Key do app)
//   ML_REDIRECT_URI=https://mukiofertas.com.br/   (exatamente igual ao cadastrado no app)
//
// Passo 1: node --env-file=.env.local scripts/ml-token.mjs
//          -> abre um link; entre com sua conta do Mercado Livre e autorize.
//          -> o navegador vai para o seu site com "?code=TG-..." no endereço. Copie esse código.
//
// Passo 2: node --env-file=.env.local scripts/ml-token.mjs TG-...
//          -> troca o código pelo token e salva no Supabase. Depois disso a renovação é automática.

import { salvarConfig } from "../lib/detalhes-ml.mjs";

const { ML_CLIENT_ID, ML_CLIENT_SECRET, ML_REDIRECT_URI } = process.env;

if (!ML_CLIENT_ID || !ML_CLIENT_SECRET || !ML_REDIRECT_URI) {
  console.error("\nFaltam ML_CLIENT_ID, ML_CLIENT_SECRET ou ML_REDIRECT_URI no .env.local\n");
  process.exit(1);
}

const codigo = process.argv[2];

if (!codigo) {
  const link =
    "https://auth.mercadolivre.com.br/authorization?response_type=code" +
    `&client_id=${encodeURIComponent(ML_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(ML_REDIRECT_URI)}`;
  console.log("\n1) Abra este link no navegador e autorize o app:\n");
  console.log(`   ${link}\n`);
  console.log('2) Você vai cair no seu site com "?code=TG-..." no endereço.');
  console.log("   Copie o código (começa com TG-) e rode em até 10 minutos:\n");
  console.log("   node --env-file=.env.local scripts/ml-token.mjs TG-SEU-CODIGO\n");
  process.exit(0);
}

const res = await fetch("https://api.mercadolibre.com/oauth/token", {
  method: "POST",
  headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    client_id: ML_CLIENT_ID,
    client_secret: ML_CLIENT_SECRET,
    code: codigo.trim(),
    redirect_uri: ML_REDIRECT_URI,
  }),
});
const json = await res.json().catch(() => ({}));

if (!res.ok || !json.refresh_token) {
  console.error(`\nO Mercado Livre recusou o código (${res.status}): ${json.message ?? json.error ?? "sem detalhe"}`);
  console.error("Gere um código novo (Passo 1) e tente de novo. Ele vale por poucos minutos e só pode ser usado uma vez.\n");
  process.exit(1);
}

await salvarConfig("ml_refresh_token", json.refresh_token);
console.log("\nPronto! O MukiOfertas está conectado à API do Mercado Livre.");
console.log("Agora rode: node --env-file=.env.local scripts/detalhar-ml.mjs --debug\n");