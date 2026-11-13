// Prazos e regras de expiração das ofertas (um só lugar para ajustar)
//
// Os valores marcados com (painel) podem ser trocados no painel admin, aba Configurações.
// O robô lê o painel no começo de cada execução (aplicarConfigDoBanco); os números
// abaixo valem quando o painel não tiver o valor ou não puder ser lido.
export const DIAS_NO_SITE = 5; // depois disso a oferta fica como "Expirado" e desce para o fim
export const DIAS_EXPIRADA_VISIVEL = 20; // depois de expirada, fica nas listas por mais 20 dias; depois sai das listas,
// mas NÃO é apagada: a página /oferta/[id] continua no ar (links do WhatsApp/Telegram/Google não quebram)
export const DIAS_BLOQUEIO_REPUBLICAR = 20; // depois de sair das listas, a oferta só volta (mesma página) após esse período
export let HORAS_ENTRE_CONFERENCIAS = 5; // (painel) o preço de cada oferta é conferido de 5 em 5 horas
export let TOLERANCIA_PERCENTUAL = 10; // (painel) o preço pode subir até 10%; passando disso, a oferta expira
// Shopee tem tolerância fixa e própria (não muda com o valor do painel)
export const TOLERANCIA_SHOPEE = 10;
const ehShopee = (o) => /^shp-/.test(o?.id_externo ?? "") || /shopee|shope\.ee/i.test(`${o?.loja ?? ""} ${o?.link ?? ""}`);
// Tolerância que vale para esta oferta (Shopee: TOLERANCIA_SHOPEE; outras lojas: a do painel)
export function toleranciaDa(oferta) {
  return ehShopee(oferta) ? TOLERANCIA_SHOPEE : TOLERANCIA_PERCENTUAL;
}

// Renovação: oferta perto de expirar que continua com o mesmo preço ganha mais dias no site
export let RENOVAR_SE_PRECO_MANTIDO = true; // (painel) false desliga a renovação
export let DIAS_RENOVACAO = 5; // (painel) quantos dias a oferta ganha a cada renovação
export const HORAS_ANTES_PARA_RENOVAR = 24; // renova quando faltar menos que isso para expirar
export let MAX_RENOVACOES = 2; // (painel) no máximo 2 renovações (0 = sem limite)

// Mercado Livre: cada oferta fica HORAS_NO_SITE_ML horas no ar. Perto de vencer, se o produto continua
// em promoção (preço não subiu e ainda está abaixo do preço "de"), ganha mais HORAS_NO_SITE_ML horas,
// sem limite de renovações. A regra das 48 h "sem aparecer na coleta" não vale para o ML.
export const HORAS_NO_SITE_ML = 62;
export function ehOfertaML(o) {
  return /^ml-/.test(o?.id_externo ?? "") || /mercado\s*livre|mercadolivre|meli\.la/i.test(`${o?.loja ?? ""} ${o?.link ?? ""}`);
}
// Quando uma oferta nova do ML vence
export function expiraNovaML(agora = new Date()) {
  return new Date(agora.getTime() + HORAS_NO_SITE_ML * 3600000);
}

// Ofertas com CUPOM (ou que são só um cupom): cupom bom costuma esgotar em horas, então elas vivem menos.
//   - entram com HORAS_COM_CUPOM horas de prazo (em vez de DIAS_NO_SITE dias)
//   - cada vez que o canal/grupo posta a mesma oferta de novo, o prazo volta a ser HORAS_COM_CUPOM
//     a partir daquele momento (repostagem = sinal de que o cupom ainda funciona)
//   - não ganham os dias extras da renovação comum; o limite total continua sendo DIAS_NO_SITE
export let HORAS_COM_CUPOM = 12; // (painel) Configurações → Validade → "horas_com_cupom"

// A oferta depende de cupom? (tem código de cupom ou está na aba Cupons)
export function temCupom(o) {
  return Boolean(o?.cupom) || o?.categoria === "cupons";
}

// O preço subiu mais que a tolerância? (se o preço caiu, a oferta continua: ficou ainda melhor)
// oferta (opcional): usa a tolerância da loja dela (ver toleranciaDa)
export function precoSubiu(precoAntigo, precoNovo, oferta = null) {
  const a = Number(precoAntigo);
  const n = Number(precoNovo);
  if (!a || !n) return false;
  const tolerancia = oferta ? toleranciaDa(oferta) : TOLERANCIA_PERCENTUAL;
  return ((n - a) / a) * 100 > tolerancia;
}

// Mantido com o nome antigo para os arquivos que ainda usam "precoMudou"
export const precoMudou = precoSubiu;

// Já está na hora de conferir o preço desta oferta de novo?
export function horaDeConferir(oferta, agora = Date.now()) {
  const ultima = oferta.preco_conferido_em || oferta.publicada_em;
  if (!ultima) return true;
  return agora - new Date(ultima).getTime() >= HORAS_ENTRE_CONFERENCIAS * 3600000;
}

// Momento em que a oferta expira: o que vier primeiro entre expires_at e publicada_em + DIAS_NO_SITE
export function momentoExpiracao(oferta) {
  const prazos = [];
  if (oferta.expires_at) prazos.push(new Date(oferta.expires_at).getTime());
  if (oferta.publicada_em) prazos.push(new Date(oferta.publicada_em).getTime() + DIAS_NO_SITE * 86400000);
  return prazos.length ? Math.min(...prazos) : null;
}

// Há quantos dias a oferta expirou (0 se ainda não expirou ou não tem data)
export function diasDesdeExpiracao(oferta, agora = Date.now()) {
  const expira = momentoExpiracao(oferta);
  if (expira === null || expira > agora) return 0;
  return (agora - expira) / 86400000;
}

// Saiu das listas do site (expirada há mais de DIAS_EXPIRADA_VISIVEL dias), mas a página continua
export function estaArquivada(oferta, agora = Date.now()) {
  return diasDesdeExpiracao(oferta, agora) > DIAS_EXPIRADA_VISIVEL;
}

// Uma oferta arquivada pode voltar ao site (na mesma página) quando a loja/canal trouxer ela de novo?
// Só depois do período de bloqueio, para o robô não ficar republicando a mesma oferta velha.
export function podeVoltar(oferta, agora = Date.now()) {
  if (!oferta || oferta.oculta_manual || oferta.ativa === false) return false;
  return diasDesdeExpiracao(oferta, agora) > DIAS_EXPIRADA_VISIVEL + DIAS_BLOQUEIO_REPUBLICAR;
}

// A oferta pode ser renovada agora? (precisa estar no ar, perto de expirar e com o mesmo preço)
export function podeRenovar(existente, precoNovo, agora = Date.now()) {
  if (!RENOVAR_SE_PRECO_MANTIDO || !existente) return false;
  if (existente.oculta_manual || existente.ativa === false) return false;
  const ml = ehOfertaML(existente);
  // ML renova sem limite enquanto estiver em promoção; as outras lojas respeitam o máximo do painel
  if (!ml && MAX_RENOVACOES > 0 && (existente.renovacoes ?? 0) >= MAX_RENOVACOES) return false;
  if (precoSubiu(existente.preco_atual, precoNovo, existente)) return false;
  // ML: ainda em promoção = preço atual abaixo do preço "de"
  if (ml && Number(existente.preco_antigo) > 0 && Number(precoNovo) >= Number(existente.preco_antigo)) return false;

  const expira = momentoExpiracao(existente);
  if (expira === null) return false;
  const falta = expira - agora;
  return falta > 0 && falta <= HORAS_ANTES_PARA_RENOVAR * 3600000;
}

// Campos para gravar numa renovação
export function camposDaRenovacao(existente, agora = new Date()) {
  const ml = ehOfertaML(existente);
  return {
    publicada_em: agora.toISOString(),
    expires_at: ml
      ? expiraNovaML(agora).toISOString()
      : new Date(agora.getTime() + DIAS_RENOVACAO * 86400000).toISOString(),
    renovacoes: (existente.renovacoes ?? 0) + 1,
  };
}

// ---------- Configurações do painel admin ----------

// Valores padrão das configurações que só o robô usa (o painel pode trocar)
export let DESCONTO_MINIMO_PUBLICAR = 20; // (painel) o robô só publica ofertas com pelo menos esse desconto (%)
export let DESCONTO_MINIMO_TECNOLOGIA = 15; // (painel) desconto mínimo para as categorias de tecnologia abaixo (%)

// Eletrônicos caros quase nunca têm 20% de desconto (R$ 450 a menos numa TV de R$ 3.000 é só 15%),
// então estas categorias usam o desconto mínimo de tecnologia
export const CATEGORIAS_TECNOLOGIA = new Set([
  "celulares", "smartphones",
  "notebooks", "notebook", "tablets", "computadores",
  "monitor", "monitores",
  "televisores", "tv",
  "hardware", "processadores", "placa-mae", "ssd", "placa-de-video", "memoria-ram", "gabinete",
  "water-cooler", "fontes",
]);

// Desconto mínimo (%) para publicar uma oferta desta categoria
export function descontoMinimoDa(categoria) {
  return CATEGORIAS_TECNOLOGIA.has(categoria)
    ? Math.min(DESCONTO_MINIMO_TECNOLOGIA, DESCONTO_MINIMO_PUBLICAR)
    : DESCONTO_MINIMO_PUBLICAR;
}

// Todas as configurações lidas do painel (as fontes, como a do AliExpress, leem daqui)
export let CONFIG_ROBO = {};

// Lê a aba Configurações do painel (tabela config_site) e aplica nos valores acima.
// Devolve todas as configurações (ou {} se não conseguiu ler). Use com o cliente service_role.
export async function aplicarConfigDoBanco(db) {
  try {
    const { data, error } = await db.from("config_site").select("dados").eq("id", 1).maybeSingle();
    if (error || !data?.dados) return {};
    const c = data.dados;
    CONFIG_ROBO = c;
    const num = (v, padrao) => (Number.isFinite(Number(v)) && v !== null && v !== "" ? Number(v) : padrao);

    TOLERANCIA_PERCENTUAL = num(c.tolerancia_percentual, TOLERANCIA_PERCENTUAL);
    HORAS_ENTRE_CONFERENCIAS = num(c.horas_entre_conferencias, HORAS_ENTRE_CONFERENCIAS);
    if (typeof c.renovar_se_preco_mantido === "boolean") RENOVAR_SE_PRECO_MANTIDO = c.renovar_se_preco_mantido;
    DIAS_RENOVACAO = num(c.dias_renovacao, DIAS_RENOVACAO);
    MAX_RENOVACOES = num(c.max_renovacoes, MAX_RENOVACOES);
    HORAS_COM_CUPOM = Math.max(1, num(c.horas_com_cupom, HORAS_COM_CUPOM));
    DESCONTO_MINIMO_PUBLICAR = num(c.desconto_minimo_publicar, DESCONTO_MINIMO_PUBLICAR);
    DESCONTO_MINIMO_TECNOLOGIA = num(c.desconto_minimo_tecnologia, DESCONTO_MINIMO_TECNOLOGIA);
    return c;
  } catch {
    return {};
  }
}

// Registra como foi a última execução de um script (aparece na aba Saúde do robô)
export async function registrarExecucao(db, script, ok, resumo) {
  try {
    await db.from("robo_status").upsert({
      script,
      ultima_execucao: new Date().toISOString(),
      ok,
      resumo: String(resumo ?? "").slice(0, 500),
    });
  } catch {
    // o painel é só informativo: falhar aqui não pode parar o robô
  }
}
