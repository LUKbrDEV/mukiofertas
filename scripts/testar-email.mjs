// Testa o envio de e-mail pelo Resend, sem precisar da VPS nem de um alerta de verdade.
// Salve como scripts/testar-email.mjs e rode no terminal do VS Code:
//   node --env-file=.env.local scripts/testar-email.mjs seu-email@gmail.com
// Usa o RESEND_API_KEY e o EMAIL_REMETENTE do .env.local.

const para = process.argv[2];
const chave = process.env.RESEND_API_KEY;
const de = process.env.EMAIL_REMETENTE;

if (!para) {
  console.error("Diga para qual e-mail mandar. Ex.: node --env-file=.env.local scripts/testar-email.mjs seu-email@gmail.com");
  process.exit(1);
}
if (!chave || !de) {
  console.error("Falta RESEND_API_KEY ou EMAIL_REMETENTE no .env.local.");
  process.exit(1);
}

console.log(`Enviando de: ${de}\nPara: ${para}\n`);

const resposta = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    from: de,
    to: [para],
    subject: "🔔 Teste do MukiOfertas: o e-mail dos alertas está funcionando",
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
      <h2 style="color:#0b4aa2;margin:0 0 8px">Tudo certo! ✅</h2>
      <p style="color:#334155;line-height:1.5">Este é um e-mail de teste do MukiOfertas. Se você recebeu, os avisos dos alertas de preço vão chegar por e-mail normalmente.</p>
      <p style="color:#94a3b8;font-size:12px">Enviado pelo scripts/testar-email.mjs</p>
    </div>`,
  }),
});

const texto = await resposta.text();
if (resposta.ok) {
  console.log("✓ E-mail enviado! Confira a caixa de entrada (e a pasta de spam/promoções).");
  console.log("Resposta do Resend:", texto);
} else {
  console.error(`✗ O Resend recusou (${resposta.status}): ${texto}\n`);
  if (/domain is not verified|not verified/i.test(texto))
    console.error("→ O domínio ainda não foi verificado no Resend (Domains). Espere aparecer \"Verified\" ou, só para testar, use EMAIL_REMETENTE=\"MukiOfertas <onboarding@resend.dev>\" mandando para o e-mail da sua conta do Resend.");
  else if (resposta.status === 401 || resposta.status === 403)
    console.error("→ A chave RESEND_API_KEY está errada ou sem permissão de envio.");
  process.exit(1);
}
