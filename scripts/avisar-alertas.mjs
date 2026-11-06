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
//
// TESTE: para avisar também sobre ofertas que entraram ANTES do alerta ser criado (só para testar):
//   node --env-file=.env.local scripts/avisar-alertas.mjs --incluir-antigas
// Para ver o que cada alerta encontrou (diagnóstico):
//   node --env-file=.env.local scripts/avisar-alertas.mjs --detalhes --incluir-antigas
//
//   4. Opcional: manda um e-mail pelo Resend (resend.com, plano grátis) se no .env.local tiver
//      RESEND_API_KEY e EMAIL_REMETENTE (ex.: "MukiOfertas <alertas@mukiofertas.com.br>").

import { createClient } from "@supabase/supabase-js";
import { estaArquivada, momentoExpiracao, registrarExecucao } from "../lib/prazos.mjs";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.mukiofertas.com.br").replace(/\/+$/, "");
const JANELA_HORAS = 6;
const INCLUIR_ANTIGAS = process.argv.includes("--incluir-antigas"); // só para testar
const DETALHES = process.argv.includes("--detalhes"); // mostra por que cada alerta achou (ou não) ofertas
const MAX_AVISOS_POR_PESSOA = 5; // por execução, para não lotar a caixa de ninguém

const normalizar = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/(\d)([a-z])/g, "$1 $2") // "34pol" → "34 pol", "1tb" → "1 tb"
    .trim();

// Palavras que as lojas quase nunca escrevem no título (ou escrevem de outro jeito, como 34" ou 34pol):
// o alerta ignora essas e procura só as que importam ("Monitor 34 Polegadas" → monitor, 34)
const IGNORAR = new Set([
  "de", "da", "do", "das", "dos", "para", "pra", "com", "sem", "e", "o", "a", "os", "as", "um", "uma", "em", "no", "na",
  "polegada", "polegadas", "pol", "inch", "inches", "pc",
]);
const palavrasDe = (t) => normalizar(t).split(" ").filter((p) => p && !IGNORAR.has(p));
const preco = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function combina(alerta, oferta, tituloNormal) {
  if (alerta.preco_max && Number(oferta.preco_atual) > Number(alerta.preco_max)) return false;
  if (!INCLUIR_ANTIGAS && new Date(oferta.publicada_em) < new Date(alerta.criado_em)) return false; // só o que entrou depois do alerta
  const titulo = ` ${tituloNormal} `;
  return palavrasDe(alerta.termo).every((p) => titulo.includes(` ${p}`)); // começo de palavra: "fry" acha "fryer"
}

const escapar = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function mandarEmail(para, itens) {
  const chave = process.env.RESEND_API_KEY;
  const de = process.env.EMAIL_REMETENTE;
  if (!chave || !de || !para) return false;

  const cartoes = itens
    .map(({ oferta, alerta }) => {
      const desconto =
        oferta.preco_antigo && Number(oferta.preco_antigo) > Number(oferta.preco_atual)
          ? Math.round(((oferta.preco_antigo - oferta.preco_atual) / oferta.preco_antigo) * 100)
          : 0;
      const url = `${SITE}/oferta/${oferta.id}`;
      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff">
        <tr>
          <td width="96" style="padding:12px">
            ${oferta.imagem ? `<img src="${escapar(oferta.imagem)}" width="84" height="84" alt="" style="display:block;width:84px;height:84px;object-fit:contain;border-radius:8px">` : ""}
          </td>
          <td style="padding:12px 12px 12px 0;font-family:Arial,sans-serif">
            <div style="font-size:12px;color:#64748b">${escapar(oferta.loja)} · alerta “${escapar(alerta.termo)}”</div>
            <a href="${url}" style="display:block;margin:4px 0 6px;color:#0f172a;font-size:15px;font-weight:bold;text-decoration:none">${escapar(oferta.titulo)}</a>
            <span style="color:#0b8a4b;font-size:18px;font-weight:bold">${preco(oferta.preco_atual)}</span>
            ${desconto > 0 ? `<span style="margin-left:6px;color:#94a3b8;text-decoration:line-through;font-size:13px">${preco(oferta.preco_antigo)}</span>
            <span style="margin-left:6px;padding:2px 6px;border-radius:6px;background:#16a34a;color:#fff;font-size:12px;font-weight:bold">-${desconto}%</span>` : ""}
            <div style="margin-top:10px"><a href="${url}" style="display:inline-block;padding:9px 16px;border-radius:999px;background:#ff7a1a;color:#ffffff;font-weight:bold;font-size:14px;text-decoration:none">Ver oferta →</a></div>
          </td>
        </tr>
      </table>`;
    })
    .join("");

  const html = `<div style="background:#f3f5f9;padding:24px 12px">
    <div style="max-width:560px;margin:0 auto;font-family:Arial,sans-serif;color:#0f172a">
      <div style="padding:16px 20px;border-radius:14px 14px 0 0;background:#0a4bb8;color:#fff;font-size:20px;font-weight:bold">
        Muki<span style="color:#ff9a4a">Ofertas</span>
      </div>
      <div style="padding:20px;background:#ffffff;border-radius:0 0 14px 14px">
        <h2 style="margin:0 0 6px;font-size:20px">🔔 Apareceu o que você estava esperando</h2>
        <p style="margin:0 0 16px;color:#475569;font-size:14px">Encontramos ${itens.length === 1 ? "uma oferta" : `${itens.length} ofertas`} para os seus alertas. Corre que oferta boa acaba rápido!</p>
        ${cartoes}
        <p style="margin:18px 0 0;color:#94a3b8;font-size:12px;line-height:1.5">Você recebeu este e-mail porque criou um alerta no MukiOfertas.
        <a href="${SITE}/alertas" style="color:#0a4bb8">Gerenciar ou apagar meus alertas</a></p>
      </div>
    </div>
  </div>`;

  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: de,
      to: [para],
      subject:
        itens.length === 1
          ? `🔔 ${itens[0].oferta.titulo.slice(0, 60)} por ${preco(itens[0].oferta.preco_atual)}`
          : `🔔 ${itens.length} ofertas dos seus alertas no MukiOfertas`,
      html,
    }),
  });
  if (!resposta.ok) console.error("E-mail não enviado:", resposta.status, await resposta.text());
  return resposta.ok;
}

// PRÉVIA: manda para você o e-mail exatamente como o cliente recebe, com 2 ofertas reais do site.
// Não grava aviso nenhum e não mexe nos alertas de ninguém.
//   node --env-file=.env.local scripts/avisar-alertas.mjs --previa=seu-email@gmail.com
async function previa(para) {
  const { data } = await db
    .from("ofertas")
    .select("id, titulo, preco_atual, preco_antigo, imagem, loja")
    .eq("ativa", true)
    .not("imagem", "is", null)
    .not("preco_antigo", "is", null)
    .order("publicada_em", { ascending: false })
    .limit(2);
  if (!data?.length) throw new Error("Nenhuma oferta para usar na prévia.");
  const itens = data.map((oferta, i) => ({ oferta, alerta: { termo: i === 0 ? "exemplo de alerta" : "outro alerta" } }));
  const ok = await mandarEmail(para, itens);
  console.log(ok ? `✓ Prévia enviada para ${para}` : "✗ Não consegui enviar a prévia (veja o erro acima).");
}

async function main() {
  const argPrevia = process.argv.find((a) => a.startsWith("--previa="));
  if (argPrevia) return previa(argPrevia.split("=")[1]);

  const desde = new Date(Date.now() - JANELA_HORAS * 3600000).toISOString();

  const [{ data: alertas, error: e1 }, { data: ofertas, error: e2 }] = await Promise.all([
    db.from("alertas").select("*").eq("ativo", true).limit(5000),
    db
      .from("ofertas")
      .select("id, titulo, preco_atual, preco_antigo, imagem, loja, publicada_em, expires_at, categoria, origem")
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

  if (DETALHES) {
    console.log(`Ofertas no ar publicadas nas últimas ${JANELA_HORAS}h: ${validas.length}\n`);
    for (const alerta of alertas ?? []) {
      const palavras = palavrasDe(alerta.termo);
      const comPalavras = validas.filter(({ titulo }) => palavras.every((p) => ` ${titulo} `.includes(` ${p}`)));
      const noPreco = comPalavras.filter(({ oferta }) => !alerta.preco_max || Number(oferta.preco_atual) <= Number(alerta.preco_max));
      const depois = noPreco.filter(({ oferta }) => new Date(oferta.publicada_em) >= new Date(alerta.criado_em));
      console.log(`Alerta "${alerta.termo}"${alerta.preco_max ? ` (até ${preco(alerta.preco_max)})` : ""} — criado em ${new Date(alerta.criado_em).toLocaleString("pt-BR")}`);
      console.log(`  palavras procuradas: ${palavras.join(", ") || "(nenhuma)"}`);
      console.log(`  ${comPalavras.length} com todas as palavras · ${noPreco.length} dentro do preço · ${depois.length} publicadas depois do alerta`);
      for (const { oferta } of noPreco.slice(0, 3)) console.log(`    - ${oferta.titulo.slice(0, 70)} (${preco(oferta.preco_atual)})`);
      // Ajuda: ofertas no ar em qualquer data com essas palavras
      const { count } = await db
        .from("ofertas")
        .select("id", { count: "exact", head: true })
        .eq("ativa", true)
        .ilike("titulo", `%${palavras[0] ?? ""}%`);
      console.log(`  (no site inteiro, ofertas ativas com "${palavras[0] ?? ""}" no título: ${count ?? "?"})\n`);
    }
  }

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
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_REMETENTE)
    console.log("E-mail desligado: crie os secrets RESEND_API_KEY e EMAIL_REMETENTE no GitHub para os avisos chegarem por e-mail.");
  await registrarExecucao(db, "avisar-alertas", true, resumo);
}

main().catch(async (erro) => {
  console.error("Erro nos alertas:", erro);
  await registrarExecucao(db, "avisar-alertas", false, `Erro: ${erro.message}`);
  process.exit(1);
});
