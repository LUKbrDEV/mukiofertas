// Envia as ofertas novas do site para o grupo do WhatsApp, pela Evolution API (VPS da Oracle).
// Salve como scripts/postar-whatsapp.mjs. Roda no GitHub Actions a cada 30 minutos (coleta.yml).
//
// O que faz:
//   1) lê as regras do painel admin (Configurações → WhatsApp): grupo, modelo da mensagem, limites
//   2) pega as ofertas que entraram no site nas últimas horas e ainda não foram para o WhatsApp
//   3) manda cada uma (com foto) para o grupo, com um intervalo entre as mensagens
//   4) marca a oferta como enviada (coluna postada_whatsapp_em), para não repetir
//
// Variáveis (no .env.local e nos Secrets do GitHub):
//   EVOLUTION_URL        ex.: https://129-151-10-20.sslip.io   (o instalar.sh mostra no final)
//   EVOLUTION_API_KEY    a chave que o instalar.sh gerou
//   EVOLUTION_INSTANCIA  o nome que você deu à conexão no painel da Evolution (ex.: mukiofertas)
//   SITE_URL             ex.: https://www.mukiofertas.com.br
//
// Testar sem enviar nada (mostra as mensagens que iriam):
//   node --env-file=.env.local scripts/postar-whatsapp.mjs --teste

import { createClient } from "@supabase/supabase-js";
import { aplicarConfigDoBanco, CONFIG_ROBO, registrarExecucao } from "../lib/prazos.mjs";
import { camposDaOferta, montarMensagem, MODELO_PADRAO, MODELO_CUPOM_PADRAO } from "../lib/whatsapp-modelo.mjs";
import { gerarFrase, ESTILO_PADRAO } from "../lib/frase-ia.mjs";
import { fotoComMarcaDagua } from "../lib/marca-dagua.mjs";
import { writeFileSync } from "node:fs";

// Valores padrão (o painel admin pode trocar)
const PADRAO = {
  whatsapp_ativo: false,
  whatsapp_grupo: "", // id do grupo, ex.: 120363012345678901@g.us (o testar-whatsapp.mjs lista os seus grupos)
  whatsapp_modelo: MODELO_PADRAO,
  whatsapp_modelo_cupom: MODELO_CUPOM_PADRAO,
  whatsapp_enviar_cupons: true,
  whatsapp_com_foto: true,
  whatsapp_max_por_execucao: 5, // o robô roda a cada 30 min: 5 por vez = até 10 por hora
  whatsapp_max_por_hora: 10,
  whatsapp_intervalo_segundos: 40, // espera entre uma mensagem e outra (varia um pouco, parece humano)
  whatsapp_desconto_minimo: 0, // % — 0 = manda tudo que entrou no site
  whatsapp_hora_inicio: 7, // só envia entre estas horas (horário de Brasília)
  whatsapp_hora_fim: 23,
  whatsapp_frase_ia: true, // frase engraçada da IA no campo {frase} (sem IA: frase sorteada do banco)
  whatsapp_frase_estilo: ESTILO_PADRAO,
  whatsapp_preco_minimo: 0,
  whatsapp_marca_dagua: true, // marca d'água (public/marca-dagua.png) na foto
  whatsapp_marca_posicao: "baixo", // baixo | baixo-direita | baixo-esquerda | topo | topo-direita | centro
  whatsapp_marca_tamanho: 55, // % da largura da foto
  whatsapp_marca_opacidade: 90, // % (100 = sem transparência) // R$ — só ofertas a partir desse preço (0 = qualquer preço)
};
const HORAS_PARA_TRAS = 6; // só ofertas que entraram no site nas últimas X horas

const TESTE = process.argv.includes("--teste");

function ajuste(chave) {
  const v = CONFIG_ROBO?.[chave];
  const p = PADRAO[chave];
  if (typeof p === "boolean") return typeof v === "boolean" ? v : p;
  if (typeof p === "number") return v !== undefined && v !== null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : p;
  return typeof v === "string" && v.trim() ? v : p;
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Evolution API ----------
const base = () => String(process.env.EVOLUTION_URL || "").replace(/\/+$/, "");
const instancia = () => encodeURIComponent(process.env.EVOLUTION_INSTANCIA || "mukiofertas");

export async function evolution(caminho, { metodo = "GET", corpo } = {}) {
  const r = await fetch(`${base()}${caminho}`, {
    method: metodo,
    headers: { apikey: process.env.EVOLUTION_API_KEY, "Content-Type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  const json = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = json?.response?.message ?? json?.message ?? json?.error ?? r.statusText;
    throw new Error(`Evolution ${caminho.split("?")[0]} -> ${r.status} ${JSON.stringify(msg).slice(0, 200)}`);
  }
  return json;
}

export async function estadoDaConexao() {
  const json = await evolution(`/instance/connectionState/${instancia()}`);
  return json?.instance?.state ?? json?.state ?? "desconhecido"; // "open" = conectado
}

async function enviar(grupo, texto, imagem) {
  if (imagem) {
    try {
      return await evolution(`/message/sendMedia/${instancia()}`, {
        metodo: "POST",
        corpo: { number: grupo, mediatype: "image", mimetype: "image/jpeg", media: imagem, caption: texto, fileName: "oferta.jpg" },
      });
    } catch (e) {
      // foto que a loja não deixa baixar: manda só o texto
      console.warn(`  foto falhou (${e.message}); enviando só o texto`);
    }
  }
  return evolution(`/message/sendText/${instancia()}`, {
    metodo: "POST",
    corpo: { number: grupo, text: texto, linkPreview: !imagem },
  });
}

// ---------- Robô ----------
function horaDeBrasilia() {
  return Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()));
}

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  await aplicarConfigDoBanco(db);

  if (!ajuste("whatsapp_ativo") && !TESTE) {
    console.log("[whatsapp] Desligado no painel admin (Configurações → WhatsApp): nada a fazer.");
    return;
  }
  const grupo = ajuste("whatsapp_grupo").trim();
  if (!grupo && !TESTE) throw new Error("Falta o id do grupo em Configurações → WhatsApp (rode o testar-whatsapp.mjs para ver os seus grupos).");
  if (!base() || !process.env.EVOLUTION_API_KEY) throw new Error("Faltam EVOLUTION_URL ou EVOLUTION_API_KEY.");

  const hora = horaDeBrasilia();
  const inicio = ajuste("whatsapp_hora_inicio");
  const fim = ajuste("whatsapp_hora_fim");
  if (!TESTE && (hora < inicio || hora >= fim)) {
    console.log(`[whatsapp] Fora do horário de envio (${inicio}h às ${fim}h). Agora são ${hora}h.`);
    return;
  }

  if (!TESTE) {
    const estado = await estadoDaConexao();
    if (estado !== "open") throw new Error(`O WhatsApp não está conectado (estado: ${estado}). Abra o painel da Evolution e leia o QR Code de novo.`);
  }

  // Limite por hora
  const umaHora = new Date(Date.now() - 3600000).toISOString();
  const { count: naUltimaHora } = await db
    .from("ofertas")
    .select("id", { count: "exact", head: true })
    .gte("postada_whatsapp_em", umaHora);
  const vagas = Math.min(ajuste("whatsapp_max_por_execucao"), ajuste("whatsapp_max_por_hora") - (naUltimaHora ?? 0));
  if (vagas <= 0) {
    console.log(`[whatsapp] Limite de ${ajuste("whatsapp_max_por_hora")} mensagens por hora atingido.`);
    return;
  }

  // Ofertas novas ainda não enviadas
  const desde = new Date(Date.now() - HORAS_PARA_TRAS * 3600000).toISOString();
  const { data, error } = await db
    .from("ofertas")
    .select("id, titulo, loja, categoria, preco_atual, preco_antigo, cupom, link, imagem, destaque, publicada_em, expires_at, ativa, origem")
    .eq("ativa", true)
    .is("postada_whatsapp_em", null)
    .gte("publicada_em", desde)
    .or("origem.is.null,origem.neq.comunidade")
    .order("publicada_em", { ascending: false })
    .limit(200);
  if (error) throw new Error(`${error.message} (rodou o whatsapp.sql no Supabase?)`);

  const descontoDe = (o) =>
    Number(o.preco_antigo) > Number(o.preco_atual) ? ((o.preco_antigo - o.preco_atual) / o.preco_antigo) * 100 : 0;
  // Tipos de produto e lojas escolhidos no painel (lista vazia = todos)
  const lista = (chave) => (Array.isArray(CONFIG_ROBO?.[chave]) ? CONFIG_ROBO[chave] : []);
  const categoriasEscolhidas = new Set(lista("whatsapp_categorias"));
  const lojasEscolhidas = new Set(lista("whatsapp_lojas_nomes").map((n) => String(n).toLowerCase()));
  const tipoOk = (o) => o.categoria === "cupons" || !categoriasEscolhidas.size || categoriasEscolhidas.has(o.categoria);
  const lojaOk = (o) => !lojasEscolhidas.size || lojasEscolhidas.has(String(o.loja).toLowerCase());
  const precoOk = (o) => o.categoria === "cupons" || Number(o.preco_atual) >= ajuste("whatsapp_preco_minimo");

  const candidatas = (data ?? [])
    .filter(tipoOk)
    .filter(lojaOk)
    .filter(precoOk)
    .filter((o) => !o.expires_at || new Date(o.expires_at) > new Date())
    .filter((o) => (o.categoria === "cupons" ? ajuste("whatsapp_enviar_cupons") && o.cupom : true))
    .filter((o) => o.categoria === "cupons" || descontoDe(o) >= ajuste("whatsapp_desconto_minimo"))
    // destaques e maiores descontos primeiro
    .sort((a, b) => Number(b.destaque) - Number(a.destaque) || descontoDe(b) - descontoDe(a))
    .slice(0, vagas);

  console.log(
    `[whatsapp] ${data?.length ?? 0} ofertas novas sem envio` +
      (categoriasEscolhidas.size || lojasEscolhidas.size ? " (com o filtro de tipos/lojas do painel)" : "") +
      `; ${candidatas.length} vão para o grupo agora.`
  );

  let enviadas = 0;
  const falhas = [];
  for (const [i, o] of candidatas.entries()) {
    const siteUrl = process.env.SITE_URL || "https://www.mukiofertas.com.br";
    let campos = camposDaOferta(o, { siteUrl });
    const modelo = o.categoria === "cupons" ? ajuste("whatsapp_modelo_cupom") : ajuste("whatsapp_modelo");
    // Frase engraçada: só é gerada se o modelo tiver o campo {frase}
    if (modelo.includes("{frase}")) {
      const { frase, origem } = await gerarFrase(o, campos, {
        estilo: ajuste("whatsapp_frase_estilo"),
        usarIa: ajuste("whatsapp_frase_ia"),
      });
      campos = { ...campos, frase };
      if (TESTE) console.log(`  (frase ${origem === "ia" ? "da IA" : "do banco"})`);
    }
    const texto = montarMensagem(modelo, campos);
    let foto = ajuste("whatsapp_com_foto") ? o.imagem : null;
    // marca d'água: a foto vai em base64 já com a marca (se falhar, vai a foto original)
    if (foto && ajuste("whatsapp_marca_dagua")) {
      const comMarca = await fotoComMarcaDagua(foto, {
        posicao: ajuste("whatsapp_marca_posicao"),
        tamanho: ajuste("whatsapp_marca_tamanho"),
        opacidade: ajuste("whatsapp_marca_opacidade"),
      });
      if (comMarca) {
        foto = comMarca;
        // no teste, salva a foto para você ver como ficou
        if (TESTE) writeFileSync(`previa-whatsapp-${i + 1}.jpg`, Buffer.from(comMarca, "base64"));
      }
    }

    if (TESTE) {
      console.log(
        `\n----- ${i + 1}. ${foto ? (foto.startsWith("http") ? "(com foto) " : `(foto com marca d'água: previa-whatsapp-${i + 1}.jpg) `) : ""}-----\n${texto}`
      );
      continue;
    }
    try {
      await enviar(grupo, texto, foto);
      await db.from("ofertas").update({ postada_whatsapp_em: new Date().toISOString() }).eq("id", o.id);
      enviadas++;
      console.log(`  ✓ ${o.titulo.slice(0, 70)}`);
    } catch (e) {
      falhas.push(e.message);
      console.warn(`  ✗ ${o.titulo.slice(0, 70)}: ${e.message}`);
    }
    // intervalo entre as mensagens, variando ±30% para não parecer robô
    if (i < candidatas.length - 1) {
      const s = ajuste("whatsapp_intervalo_segundos");
      await esperar(Math.round(s * (0.7 + Math.random() * 0.6) * 1000));
    }
  }

  if (TESTE) {
    console.log("\n(teste: nada foi enviado)\n");
    return;
  }
  const resumo = `${enviadas} enviadas para o grupo` + (falhas.length ? ` | ${falhas.length} falharam: ${falhas[0]}` : "");
  console.log(`[whatsapp] ${resumo}`);
  await registrarExecucao(db, "postar-whatsapp", falhas.length === 0 || enviadas > 0, resumo);
}

// Roda só quando chamado direto (o testar-whatsapp.mjs importa as funções acima)
if (process.argv[1]?.endsWith("postar-whatsapp.mjs")) {
  main().catch(async (erro) => {
    console.error("[whatsapp] Erro:", erro.message);
    try {
      const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      await registrarExecucao(db, "postar-whatsapp", false, `Erro: ${erro.message}`);
    } catch {}
    process.exit(1);
  });
}
