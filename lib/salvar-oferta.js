import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { parseOferta } from "./parse-oferta";
import { imagemDoLink } from "./imagem";
import { chaveDaOferta } from "./duplicadas.mjs";
import { buscarPrecoAntigoDetalhado } from "./preco-antigo.mjs";
import { regrasDeQualidade, motivoDeRecusa, lojaBloqueada } from "./qualidade.mjs";
import { lojasDeCupom, lojaDeCupomPermitida } from "./lojas-cupom.mjs";
import { DIAS_NO_SITE, podeRenovar, podeVoltar, camposDaRenovacao, CATEGORIAS_TECNOLOGIA, precoSubiu } from "./prazos.mjs";

// Amazon: o preço muda rápido e o robô não pode conferir a página da loja (regras da Amazon),
// então as ofertas dela ficam menos tempo no site. Se a mesma oferta for postada de novo no canal
// (com preço igual ou menor), ela volta/renova. Horas ajustáveis no painel (Configurações → Validade).
const HORAS_AMAZON_PADRAO = 24;
const ehAmazon = (loja) => /amazon/i.test(String(loja ?? ""));
import { buscarDetalhesML, ehMercadoLivre } from "./detalhes-ml.mjs";
import { converterLinkMagalu } from "./afiliado-magalu.mjs";
import { prepararLinkRakuten } from "./afiliado-rakuten.mjs";
import { classificar } from "./classificar.mjs";
import { detectarRelampago, HORAS_RELAMPAGO_PADRAO } from "./relampago.mjs";

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
const IGNORAR_CATEGORIAS = []; // ex.: ["moda-infantil"] para não subir uma categoria
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
    qualidade: regrasDeQualidade(dados), // Shopee e AliExpress (lib/qualidade.mjs)
    lojasCupom: lojasDeCupom(dados), // lojas que podem ter cupom no site
    horasAmazon: num(dados.amazon_horas_no_site, HORAS_AMAZON_PADRAO),
    horasRelampago: num(dados.relampago_horas_padrao, HORAS_RELAMPAGO_PADRAO),
  };
  configLidaEm = Date.now();
  return configCache;
}

// Frete grátis informado na mensagem do canal
const REGEX_FRETE_GRATIS = /frete\s+gr[aá]tis|entrega\s+gr[aá]tis|sem\s+frete/i;

// Registra o resultado de cada postagem do canal (aparece no painel, aba Saúde do robô).
// Nunca atrapalha a importação: se o registro falhar, a oferta segue normalmente.
async function registrar(texto, origem, resultado, extras = {}) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const oferta = parseOferta(texto);
    await supabase.from("telegram_log").insert({
      origem,
      motivo: resultado?.motivo ?? (resultado?.ok ? "salva" : "erro"),
      loja: oferta?.loja ?? null,
      titulo: oferta?.titulo ? String(oferta.titulo).slice(0, 200) : String(texto || "").slice(0, 120),
      link: oferta?.link ?? null,
      preco: oferta?.precoAtual ?? null,
      desconto: resultado?.desconto ?? null,
      detalhe: resultado?.detalhe ? String(resultado.detalhe).slice(0, 300) : null,
      // texto original da postagem: permite "Publicar mesmo assim" pelo painel
      texto: String(texto || "").slice(0, 4000),
      extras: extras?.imagem ? { imagem: extras.imagem } : null,
    });
    // limpeza: guarda só os últimos 7 dias
    if (Math.random() < 0.05) {
      await supabase
        .from("telegram_log")
        .delete()
        .lt("criado_em", new Date(Date.now() - 7 * 86400000).toISOString());
    }
  } catch {
    // o registro é só informativo
  }
}

// Frase de chamada em vez do nome do produto: quase tudo em MAIÚSCULAS ou gírias de grupo
function pareceChamada(titulo) {
  const t = String(titulo ?? "");
  const letras = t.replace(/[^\p{L}]/gu, "");
  const maiusculas = letras.replace(/[^\p{Lu}]/gu, "").length;
  if (letras.length >= 10 && maiusculas / letras.length > 0.7) return true;
  return /\b(conto|contos|te falar|bem avaliad[oa]|t[aá] barato|corre+|galera|olha s[oó]|achadinho|imperd[ií]vel|pra casa|baratinho|vale muito|pre[cç]o de banana)\b/iu.test(t);
}

export async function salvarOferta(texto, origem = "telegram", extras = {}) {
  const resultado = await salvarOfertaDoCanal(texto, origem, extras);
  await registrar(texto, origem, resultado, extras);
  return resultado;
}

// Publicar mesmo assim (botão do painel admin): ignora o preço antigo, o desconto mínimo
// e o limite por hora. Repetidas continuam sendo recusadas.
export async function publicarMesmoAssim(texto, origem = "telegram", extras = {}) {
  return salvarOfertaDoCanal(texto, origem, { ...extras, forcar: true });
}

async function salvarOfertaDoCanal(texto, origem = "telegram", extras = {}) {
  const oferta = parseOferta(texto);
  if (!oferta) return { ok: true, motivo: "sem_titulo_ou_link" };

  // Netshoes (Rakuten): troca o link pelo SEU link de afiliado. A página direta da loja fica guardada
  // para buscar foto/preço, assim o robô nunca abre o link de afiliado (não gera clique falso).
  let paginaDaLoja = null;
  const rakuten = await prepararLinkRakuten(oferta.link, oferta.loja).catch(() => null);
  if (rakuten) {
    oferta.link = rakuten.link;
    oferta.loja = rakuten.loja;
    paginaDaLoja = rakuten.pagina;
    oferta.categoria = oferta.categoria === "cupons" ? "cupons" : classificar(oferta.titulo, rakuten.loja) ?? oferta.categoria;
  }
  if (lojaBloqueada(oferta)) return { ok: true, motivo: "loja_bloqueada", detalhe: oferta.loja };
  // Postagem que é só um cupom ("20% OFF, Limite de R$ 20"): vai para a aba Cupons
  // Título que é frase de chamada ("70 CONTO CADA CAMERA BEM AVALIADA", "E te falar que tá bem avaliado"):
  // no Mercado Livre, troca pelo nome oficial do produto (API do ML) e classifica de novo
  let detalhesML = null;
  if (ehMercadoLivre(oferta.loja) && oferta.categoria !== "cupons" && pareceChamada(oferta.titulo)) {
    detalhesML = await buscarDetalhesML(oferta.link).catch(() => null);
    if (detalhesML?.titulo) {
      oferta.titulo = String(detalhesML.titulo).trim().slice(0, 200);
      oferta.categoria = classificar(oferta.titulo, oferta.loja) ?? oferta.categoria;
    }
  }

  const ehCupom = oferta.categoria === "cupons";
  if (oferta.precoAtual === null && !ehCupom) return { ok: true, motivo: "sem_preco" };

  // Sem categoria reconhecida: não publica (aparece no painel; dá para "Publicar mesmo assim")
  if (!oferta.categoria && !extras.forcar) return { ok: true, motivo: "sem_categoria" };

  // Categorias que você não quer no site
  if (IGNORAR_CATEGORIAS.includes(oferta.categoria)) {
    return { ok: true, motivo: "categoria_ignorada" };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const regras = await regrasDoTelegram(supabase);

  // Cupom de loja fora da lista (painel → Configurações → Cupons): não entra
  if (ehCupom && !extras.forcar && !lojaDeCupomPermitida(oferta.loja, regras.lojasCupom))
    return { ok: true, motivo: "cupom_loja_bloqueada", detalhe: oferta.loja };
  if (regras.pausado && !extras.forcar) return { ok: true, motivo: "importacao_pausada" };
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

  // Oferta antiga (fora das listas há bastante tempo) postada de novo: volta ao site na mesma página
  let voltarNoId = null;

  if (erroBusca) {
    console.error("Erro ao buscar oferta:", erroBusca);
    return { ok: false, motivo: "erro_busca", detalhe: erroBusca.message };
  }
  if (existente && existente.length > 0 && podeVoltar(existente[0])) {
    voltarNoId = existente[0].id;
  } else if (existente && existente.length > 0) {
    // Amazon: postada de novo com preço igual ou menor → volta para o site por mais X horas
    // (mesmo que já tenha expirado), com o preço novo
    const e = existente[0];
    if (ehAmazon(oferta.loja) && !e.oculta_manual && e.ativa !== false && !precoSubiu(e.preco_atual, oferta.precoAtual)) {
      const agoraR = new Date();
      const { error: erroAmazon } = await supabase
        .from("ofertas")
        .update({
          preco_atual: Math.min(Number(e.preco_atual) || oferta.precoAtual, oferta.precoAtual),
          publicada_em: agoraR.toISOString(),
          atualizado_em: agoraR.toISOString(),
          expires_at: new Date(agoraR.getTime() + regras.horasAmazon * 3600000).toISOString(),
          renovacoes: (e.renovacoes ?? 0) + 1,
          // postada de novo como relâmpago: a contagem começa de novo
          relampago_ate: detectarRelampago(texto, { horasPadrao: regras.horasRelampago }) ?? undefined,
        })
        .eq("id", e.id);
      if (!erroAmazon) return { ok: true, motivo: "renovada" };
    }
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
  const expira = ehAmazon(oferta.loja)
    ? new Date(agora.getTime() + regras.horasAmazon * 3600000)
    : new Date(agora.getTime() + DIAS_NO_SITE * 24 * 60 * 60 * 1000);

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
  if (MAX_POR_HORA > 0 && !extras.forcar) {
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
  const [imagem, busca, detalhes] = await Promise.all([
    extras.imagem || imagemDoLink(paginaDaLoja ?? oferta.link),
    oferta.precoAntigo || ehCupom ? null : buscarPrecoAntigoDetalhado(paginaDaLoja ?? oferta.link, oferta.precoAtual),
    detalhesML ?? (ehMercadoLivre(oferta.loja) ? buscarDetalhesML(oferta.link) : null),
  ]);
  // Cupom não tem preço "de" (o valor da postagem é o limite ou o mínimo do cupom)
  const precoAntigoDaLoja = busca?.preco ?? null;
  const precoAntigo = ehCupom ? null : oferta.precoAntigo ?? precoAntigoDaLoja ?? null;

  // Filtro de desconto
  const desconto = precoAntigo
    ? Math.round(((precoAntigo - oferta.precoAtual) / precoAntigo) * 100)
    : null;
  // extras.aceitarSemDesconto: lojas que nunca mandam o preço "de" e bloqueiam a leitura da página
  // (ex.: Netshoes pelo leitor de canais) entram só com o preço atual, sem tag de desconto
  if (desconto === null && EXIGIR_DESCONTO && !extras.forcar && !extras.aceitarSemDesconto && !ehCupom)
    return { ok: true, motivo: "sem_desconto", detalhe: busca?.motivo ?? null };
  if (desconto !== null && desconto < DESCONTO_MINIMO && !extras.forcar)
    return { ok: true, motivo: "desconto_baixo", desconto, detalhe: `mínimo ${DESCONTO_MINIMO}%` };

  // Shopee e AliExpress: barato demais ou desconto inflado não entra
  const recusa = motivoDeRecusa(
    { loja: oferta.loja, categoria: oferta.categoria, preco_atual: oferta.precoAtual, preco_antigo: precoAntigo },
    regras.qualidade
  );
  if (recusa && !extras.forcar) return { ok: true, motivo: "marketplace_suspeito", desconto, detalhe: recusa };

  // "Oferta relâmpago" na postagem: guarda até quando vale (contagem regressiva no site)
  const relampagoAte = detectarRelampago(texto, { horasPadrao: regras.horasRelampago });

  const campos = {
    titulo: oferta.titulo,
    relampago_ate: relampagoAte,
    categoria: oferta.categoria,
    preco_atual: oferta.precoAtual ?? 0,
    preco_antigo: precoAntigo,
    link: converterLinkMagalu(oferta.link), // Magalu: link da sua loja do Influenciador
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
    sobre: detalhes?.sobre?.length ? detalhes.sobre : null,
    especificacoes: detalhes?.especificacoes?.length ? detalhes.especificacoes : null,
  };

  const gravar = (c) =>
    voltarNoId
      ? supabase
          .from("ofertas")
          .update({ ...c, renovacoes: 0, preco_conferido_em: agora.toISOString() })
          .eq("id", voltarNoId)
      : supabase.from("ofertas").insert({ loja: oferta.loja, id_externo: idExterno, ...c });
  let { error } = await gravar(campos);
  // Banco ainda sem a coluna relampago_ate (supabase-relampago.sql não rodado): salva sem ela
  if (error && /relampago_ate/.test(error.message)) {
    const { relampago_ate: _semColuna, ...semRelampago } = campos;
    ({ error } = await gravar(semRelampago));
  }

  if (error) {
    console.error("Erro ao salvar oferta:", error);
    return { ok: false, motivo: "erro_insert", detalhe: error.message };
  }
  return { ok: true, motivo: voltarNoId ? "voltou" : "salva", desconto };
}