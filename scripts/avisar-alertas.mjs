// Robô dos alertas de preço: confere as ofertas novas e avisa quem pediu.
// Salve como scripts/avisar-alertas.mjs e rode na raiz do projeto (na VPS, de 15 em 15 minutos):
//
//   node --env-file=.env.local scripts/avisar-alertas.mjs
//
// Exemplo de linha no crontab da VPS (crontab -e):
//   */15 * * * * cd /caminho/do/mukiofertas && node --env-file=.env.local scripts/avisar-alertas.mjs >> logs/alertas.log 2>&1
//
// O que faz:
//   1. Pega as ofertas que entraram nas últimas 6 horas (no ar, não expiradas).
//   2. Para cada alerta ativo, vê se o título tem TODAS as palavras do alerta e se o preço
//      está dentro do máximo (quando a pessoa colocou um).
//   3. Grava o aviso em avisos_alerta (a pessoa vê no canto da tela e na página /alertas).
//      O mesmo aviso nunca é gravado duas vezes (o banco não deixa).
//   4. Opcional: manda um e-mail pelo Resend (resend.com, plano grátis) se no .env.local tiver
//      RESEND_API_KEY e EMAIL_REMETENTE (ex.: "MukiOfertas <alertas@mukiofertas.com.br>").

import { createClient } from "@supabase/supabase-js";
import { estaArquivada, momentoExpiracao, registrarExecucao } from "../lib/prazos.mjs";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.mukiofertas.com.br").replace(/\/+$/, "");
const JANELA_HORAS = 6;
const MAX_AVISOS_POR_PESSOA = 5; // por execução, para não lotar a caixa de ninguém

const normalizar = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const palavrasDe = (t) => normalizar(t).split(" ").filter(Boolean);
const preco = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function combina(alerta, oferta, tituloNormal) {
  if (alerta.preco_max && Number(oferta.preco_atual) > Number(alerta.preco_max)) return false;
  if (new Date(oferta.publicada_em) < new Date(alerta.criado_em)) return false; // só o que entrou depois do alerta
  const titulo = ` ${tituloNormal} `;
  return palavrasDe(alerta.termo).every((p) => titulo.includes(` ${p}`)); // começo de palavra: "fry" acha "fryer"
}

async function mandarEmail(para, itens) {
  const chave = process.env.RESEND_API_KEY;
  const de = process.env.EMAIL_REMETENTE;
  if (!chave || !de || !para) return false;

  const linhas = itens
    .map(
      ({ oferta, alerta }) =>
        `<li style="margin:8px 0"><a href="${SITE}/oferta/${oferta.id}" style="color:#0a4bb8;font-weight:700">${oferta.titulo
          .replace(/</g, "&lt;")}</a><br>${preco(oferta.preco_atual)} na ${oferta.loja} · alerta “${alerta.termo.replace(/</g, "&lt;")}”</li>`
    )
    .join("");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#0f172a">
    <h2 style="color:#0a4bb8">🔔 Apareceu o que você estava esperando</h2>
    <ul style="padding-left:18px">${linhas}</ul>
    <p style="color:#64748b;font-size:13px">Você recebeu porque criou um alerta no MukiOfertas.
    <a href="${SITE}/alertas">Gerenciar ou apagar meus alertas</a></p></div>`;

  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: de,
      to: [para],
      subject: itens.length === 1 ? `🔔 ${itens[0].oferta.titulo.slice(0, 70)}` : `🔔 ${itens.length} ofertas dos seus alertas`,
      html,
    }),
  });
  if (!resposta.ok) console.error("E-mail não enviado:", resposta.status, await resposta.text());
  return resposta.ok;
}

async function main() {
  const desde = new Date(Date.now() - JANELA_HORAS * 3600000).toISOString();

  const [{ data: alertas, error: e1 }, { data: ofertas, error: e2 }] = await Promise.all([
    db.from("alertas").select("*").eq("ativo", true).limit(5000),
    db
      .from("ofertas")
      .select("id, titulo, preco_atual, loja, publicada_em, expires_at, categoria, origem")
      .eq("ativa", true)
      .gte("publicada_em", desde)
      .limit(3000),
  ]);
  if (e1 || e2) throw new Error((e1 || e2).message);

  const agora = Date.now();
  const validas = (ofertas ?? [])
    .filter((o) => o.categoria !== "cupons")
    .filter((o) => {
      const expira = momentoExpiracao(o);
      return (expira === null || expira > agora) && !estaArquivada(o);
    })
    .map((o) => ({ oferta: o, titulo: normalizar(o.titulo) }));

  // Junta os avisos por pessoa
  const porPessoa = new Map();
  for (const alerta of alertas ?? []) {
    for (const { oferta, titulo } of validas) {
      if (!combina(alerta, oferta, titulo)) continue;
      const lista = porPessoa.get(alerta.user_id) ?? [];
      if (!lista.some((x) => x.oferta.id === oferta.id)) lista.push({ alerta, oferta });
      porPessoa.set(alerta.user_id, lista);
    }
  }

  let novos = 0;
  let emails = 0;
  for (const [userId, itens] of porPessoa) {
    // Grava os avisos; os que já existiam são ignorados (unique alerta_id + oferta_id)
    const { data: gravados, error } = await db
      .from("avisos_alerta")
      .upsert(
        itens.slice(0, MAX_AVISOS_POR_PESSOA).map(({ alerta, oferta }) => ({
          alerta_id: alerta.id,
          user_id: userId,
          oferta_id: oferta.id,
        })),
        { onConflict: "alerta_id,oferta_id", ignoreDuplicates: true }
      )
      .select("alerta_id, oferta_id");
    if (error) {
      console.error("Erro ao gravar avisos:", error.message);
      continue;
    }
    const realmenteNovos = itens.filter(({ alerta, oferta }) =>
      (gravados ?? []).some((g) => g.alerta_id === alerta.id && g.oferta_id === oferta.id)
    );
    if (realmenteNovos.length === 0) continue;
    novos += realmenteNovos.length;

    await db
      .from("alertas")
      .update({ ultimo_aviso_em: new Date().toISOString() })
      .in("id", [...new Set(realmenteNovos.map((x) => x.alerta.id))]);

    if (process.env.RESEND_API_KEY) {
      const { data: conta } = await db.auth.admin.getUserById(userId);
      if (await mandarEmail(conta?.user?.email, realmenteNovos)) emails++;
    }
  }

  const resumo = `${(alertas ?? []).length} alertas ativos, ${validas.length} ofertas novas conferidas, ${novos} avisos, ${emails} e-mails`;
  console.log(resumo);
  await registrarExecucao(db, "avisar-alertas", true, resumo);
}

main().catch(async (erro) => {
  console.error("Erro nos alertas:", erro);
  await registrarExecucao(db, "avisar-alertas", false, `Erro: ${erro.message}`);
  process.exit(1);
});
