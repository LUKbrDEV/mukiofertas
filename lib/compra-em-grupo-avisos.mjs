// E-mail "Abriu um grupo do produto que você queria" (botão "Avisar sobre novos grupos").
// Salve como lib/compra-em-grupo-avisos.mjs. Usado por app/api/compra-em-grupo/route.js.
// Envia pelo Resend (o mesmo dos alertas): precisa de RESEND_API_KEY e EMAIL_REMETENTE nas
// variáveis do site (Vercel). Sem elas, nada é enviado e os pedidos ficam guardados.

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.mukiofertas.com.br").replace(/\/+$/, "");
const escapar = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function avisarNovoGrupo(db, { produto, faltam, autorId, urlProduto }) {
  const chave = process.env.RESEND_API_KEY;
  const de = process.env.EMAIL_REMETENTE;
  if (!chave || !de) return 0;

  const { data: pedidos } = await db
    .from("grupos_avisos")
    .select("id, user_id, email")
    .eq("produto_id", produto.id)
    .neq("user_id", autorId)
    .limit(100);
  if (!pedidos?.length) return 0;

  const url = `${SITE}${urlProduto}`;
  const html = `<div style="background:#f3f5f9;padding:24px 12px">
    <div style="max-width:560px;margin:0 auto;font-family:Arial,sans-serif;color:#0f172a">
      <div style="padding:16px 20px;border-radius:14px 14px 0 0;background:#0a4bb8;color:#fff;font-size:20px;font-weight:bold">
        Muki<span style="color:#ff9a4a">Ofertas</span>
      </div>
      <div style="padding:20px;background:#ffffff;border-radius:0 0 14px 14px">
        <h2 style="margin:0 0 6px;font-size:20px">👥 Abriu um grupo que você estava esperando</h2>
        <p style="margin:0 0 16px;color:#475569;font-size:14px">${faltam === 1 ? "Falta só 1 pessoa" : `Faltam ${faltam} pessoas`}. O grupo tem 24 horas para fechar.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px">
          <tr>
            <td width="96" style="padding:12px">${produto.imagem ? `<img src="${escapar(produto.imagem)}" width="84" height="84" alt="" style="display:block;width:84px;height:84px;object-fit:contain;border-radius:8px">` : ""}</td>
            <td style="padding:12px 12px 12px 0">
              <a href="${url}" style="display:block;margin:0 0 10px;color:#0f172a;font-size:15px;font-weight:bold;text-decoration:none">${escapar(produto.titulo)}</a>
              <a href="${url}" style="display:inline-block;padding:9px 16px;border-radius:999px;background:#ff7a1a;color:#ffffff;font-weight:bold;font-size:14px;text-decoration:none">Entrar no grupo →</a>
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;color:#94a3b8;font-size:12px;line-height:1.5">Você recebeu este e-mail porque tocou em "Avisar sobre novos grupos" neste produto no MukiOfertas. É um aviso só: para receber de novo, toque no botão outra vez.</p>
      </div>
    </div>
  </div>`;

  let enviados = 0;
  for (const p of pedidos) {
    if (!p.email) continue;
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: de,
          to: [p.email],
          subject: `👥 Grupo aberto: ${String(produto.titulo).slice(0, 60)}`,
          html,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) enviados++;
      else console.error("E-mail de grupo não enviado:", r.status);
    } catch (e) {
      console.error("E-mail de grupo não enviado:", e.message);
    }
  }
  // aviso único: apaga os pedidos atendidos
  await db.from("grupos_avisos").delete().in("id", pedidos.map((p) => p.id));
  return enviados;
}
