import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { parseOferta } from "./parse-oferta";
import { imagemDoLink } from "./imagem";
import { chaveDaOferta } from "./duplicadas.mjs";
import { buscarPrecoAntigo } from "./preco-antigo.mjs";
import { DIAS_NO_SITE, podeRenovar, camposDaRenovacao, CATEGORIAS_TECNOLOGIA } from "./prazos.mjs";
import { buscarDetalhesML, ehMercadoLivre } from "./detalhes-ml.mjs";

// ===== AJUSTES =====
// Os 4 primeiros valores podem ser trocados no painel admin (aba Configurações → Telegram).
// Os números abaixo valem quando o painel não tiver o valor.
const PADRAO = {
  telegram_max_por_hora: 20, // no máximo X ofertas novas por hora (0 = sem limite)
  telegram_desconto_minimo: 25, // se o desconto for conhecido e menor que isso, não sobe
  telegram_exigir_desconto: true, // true = só sobe oferta com preço antigo conhecido
  telegram_pausado: false, // true = não importa nada do canal
  desconto_minimo_tecnologia: 15, // TVs, monitores, notebooks, celulares e hardware entram com menos desconto
};
const IGNORAR_CATEGORIAS = []; // ex.: ["outros"] para não subir "Outras ofertas"
// ====================

// Lê as regras do painel admin (tabela config_site). Guarda por 1 minuto para não
// consultar o banco a cada mensagem do canal.
let configCache = null;
let configLidaEm = 0;
async function regrasDoTelegram(supabase) {
  if (configCache && Date.now() - configLidaEm < 60000) return configCache;
  let dados = {};
  try {
    const { data } = await supabase.from("config_site").select("dados").eq("id", 1).maybeSingle();
    dados = data?.dados ?? {};
  } catch {
    // sem a tabela ainda: usa os valores padrão
  }
  const num = (v, p) => (v !== null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : p);
  configCache = {
    maxPorHora: num(dados.telegram_max_por_hora, PADRAO.telegram_max_por_hora),
    descontoMinimo: num(dados.telegram_desconto_minimo, PADRAO.telegram_desconto_minimo),
    exigirDesconto:
      typeof dados.telegram_exigir_desconto === "boolean" ? dados.telegram_exigir_desconto : PADRAO.telegram_exigir_desconto,
    pausado: typeof dados.telegram_pausado === "boolean" ? dados.telegram_pausado : PADRAO.telegram_pausado,
    descontoMinimoTecnologia: num(dados.desconto_minimo_tecnologia, PADRAO.desconto_minimo_tecnologia),
  };
  configLidaEm = Date.now();
  return configCache;
}

// Frete grátis informado na mensagem do canal
const REGEX_FRETE_GRATIS = /frete\s+gr[aá]tis|entrega\s+gr[aá]tis|sem\s+frete/i;

export async function salvarOferta(texto, origem = "telegram", extras = {}) {
  const oferta = parseOferta(texto);
  if (!oferta) return { ok: true, motivo: "sem_titulo_ou_link" };
  if (oferta.precoAtual === null) return { ok: true, motivo: "sem_preco" };

  // Categorias que você não quer no site
  if (IGNORAR_CATEGORIAS.includes(oferta.categoria)) {
    return { ok: true, motivo: "categoria_ignorada" };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const regras = await regrasDoTelegram(supabase);
  if (regras.pausado) return { ok: true, motivo: "importacao_pausada" };
  const MAX_POR_HORA = regras.maxPorHora;
  // tecnologia (TV, monitor, notebook, celular, hardware) entra com o desconto mínimo de tecnologia
  const DESCONTO_MINIMO = CATEGORIAS_TECNOLOGIA.has(oferta.categoria)
    ? Math.min(regras.descontoMinimo, regras.descontoMinimoTecnologia)
    : regras.descontoMinimo;
  const EXIGIR_DESCONTO = regras.exigirDesconto;

  const idExterno =
    "tg-" + createHash("sha1").update(oferta.link.toLowerCase()).digest("hex").slice(0, 16);

  // Evita duplicada (mesmo link ou mesmo id)
  const { data: existente, error: erroBusca } = await supabase
    .from("ofertas")
    .select("id, ativa, oculta_manual, publicada_em, expires_at, preco_atual, renovacoes")
    .or(`link.eq.${oferta.link},id_externo.eq.${idExterno}`)
    .limit(1);

  if (erroBusca) {
    console.error("Erro ao buscar oferta:", erroBusca);
    return { ok: false, motivo: "erro_busca", detalhe: erroBusca.message };
  }
  if (existente && existente.length > 0) {
    // A mesma oferta foi postada de novo no canal, perto de expirar e com o mesmo preço:
    // em vez de ignorar, ela ganha mais dias no site
    if (podeRenovar(existente[0], oferta.precoAtual)) {
      const { error: erroRenovar } = await supabase
        .from("ofertas")
        .update(camposDaRenovacao(existente[0]))
        .eq("id", existente[0].id);
      if (!erroRenovar) return { ok: true, motivo: "renovada" };
      console.error("Erro ao renovar oferta:", erroRenovar);
    }
    return { ok: true, motivo: "duplicada" };
  }

  const agora = new Date();
  const expira = new Date(agora.getTime() + DIAS_NO_SITE * 24 * 60 * 60 * 1000);

  // Evita duplicada pelo título: mesma loja, mesmo título e mesmo preço nos últimos dias,
  // mesmo que o link de afiliado seja outro
  const desde = new Date(agora.getTime() - DIAS_NO_SITE * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentes, error: erroRecentes } = await supabase
    .from("ofertas")
    .select("loja, titulo, preco_atual")
    .eq("loja", oferta.loja)
    .gte("publicada_em", desde)
    .limit(1000);

  if (erroRecentes) {
    console.error("Erro ao buscar ofertas recentes:", erroRecentes);
    return { ok: false, motivo: "erro_busca", detalhe: erroRecentes.message };
  }

  const minhaChave = chaveDaOferta({
    loja: oferta.loja,
    titulo: oferta.titulo,
    preco_atual: oferta.precoAtual,
  });
  if ((recentes ?? []).some((o) => chaveDaOferta(o) === minhaChave)) {
    return { ok: true, motivo: "duplicada_titulo" };
  }

  // Limite de ofertas novas por hora
  if (MAX_POR_HORA > 0) {
    const umaHoraAtras = new Date(agora.getTime() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("ofertas")
      .select("id", { count: "exact", head: true })
      .eq("origem", origem)
      .gte("publicada_em", umaHoraAtras);
    if ((count ?? 0) >= MAX_POR_HORA) return { ok: true, motivo: "limite_por_hora" };
  }

  // Imagem, preço antigo e detalhes do produto são buscados ao mesmo tempo.
  // O preço antigo só é procurado na loja se a mensagem não trouxe um.
  // "Sobre o produto" e "Especificações" por enquanto só vêm do Mercado Livre.
  const [imagem, precoAntigoDaLoja, detalhes] = await Promise.all([
    extras.imagem || imagemDoLink(oferta.link),
    oferta.precoAntigo ? null : buscarPrecoAntigo(oferta.link, oferta.precoAtual),
    ehMercadoLivre(oferta.loja) ? buscarDetalhesML(oferta.link) : null,
  ]);
  const precoAntigo = oferta.precoAntigo ?? precoAntigoDaLoja ?? null;

  // Filtro de desconto
  const desconto = precoAntigo
    ? Math.round(((precoAntigo - oferta.precoAtual) / precoAntigo) * 100)
    : null;
  if (desconto === null && EXIGIR_DESCONTO) return { ok: true, motivo: "sem_desconto" };
  if (desconto !== null && desconto < DESCONTO_MINIMO) return { ok: true, motivo: "desconto_baixo" };

  const { error } = await supabase.from("ofertas").insert({
    loja: oferta.loja,
    id_externo: idExterno,
    titulo: oferta.titulo,
    categoria: oferta.categoria,
    preco_atual: oferta.precoAtual,
    preco_antigo: precoAntigo,
    link: oferta.link,
    cupom: oferta.cupom,
    frete_gratis: REGEX_FRETE_GRATIS.test(String(texto || "")),
    origem,
    ativa: true,
    publicada_em: agora.toISOString(),
    atualizado_em: agora.toISOString(),
    expires_at: expira.toISOString(),
    // já está no canal, então o script de postagem não deve postar de novo
    postada_telegram_em: agora.toISOString(),
    imagem: imagem,
    sobre: detalhes?.sobre ?? null,
    especificacoes: detalhes?.especificacoes ?? null,
  });

  if (error) {
    console.error("Erro ao salvar oferta:", error);
    return { ok: false, motivo: "erro_insert", detalhe: error.message };
  }
  return { ok: true, motivo: "salva" };
}