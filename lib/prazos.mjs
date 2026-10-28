// Prazos e regras de expiração das ofertas (um só lugar para ajustar)
export const DIAS_NO_SITE = 5; // depois disso a oferta fica como "Expirado" e desce para o fim
export const DIAS_EXPIRADA_VISIVEL = 20; // depois de expirada, fica visível por mais 20 dias e é apagada
export const DIAS_BLOQUEIO_REPUBLICAR = 20; // oferta apagada não é publicada de novo pelo coletor nesse período
export const HORAS_ENTRE_CONFERENCIAS = 5; // o preço de cada oferta é conferido de 5 em 5 horas
export const TOLERANCIA_PERCENTUAL = 10; // o preço pode subir até 10%; passando disso, a oferta expira

// Renovação: oferta perto de expirar que continua com o mesmo preço ganha mais dias no site
export const RENOVAR_SE_PRECO_MANTIDO = true; // false desliga a renovação
export const DIAS_RENOVACAO = 5; // quantos dias a oferta ganha a cada renovação
export const HORAS_ANTES_PARA_RENOVAR = 24; // renova quando faltar menos que isso para expirar
export const MAX_RENOVACOES = 2; // no máximo 2 renovações (0 = sem limite)

// O preço subiu mais que a tolerância? (se o preço caiu, a oferta continua: ficou ainda melhor)
export function precoSubiu(precoAntigo, precoNovo) {
  const a = Number(precoAntigo);
  const n = Number(precoNovo);
  if (!a || !n) return false;
  return ((n - a) / a) * 100 > TOLERANCIA_PERCENTUAL;
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

// A oferta pode ser renovada agora? (precisa estar no ar, perto de expirar e com o mesmo preço)
export function podeRenovar(existente, precoNovo, agora = Date.now()) {
  if (!RENOVAR_SE_PRECO_MANTIDO || !existente) return false;
  if (existente.oculta_manual || existente.ativa === false) return false;
  if (MAX_RENOVACOES > 0 && (existente.renovacoes ?? 0) >= MAX_RENOVACOES) return false;
  if (precoSubiu(existente.preco_atual, precoNovo)) return false;

  const expira = momentoExpiracao(existente);
  if (expira === null) return false;
  const falta = expira - agora;
  return falta > 0 && falta <= HORAS_ANTES_PARA_RENOVAR * 3600000;
}

// Campos para gravar numa renovação
export function camposDaRenovacao(existente, agora = new Date()) {
  return {
    publicada_em: agora.toISOString(),
    expires_at: new Date(agora.getTime() + DIAS_RENOVACAO * 86400000).toISOString(),
    renovacoes: (existente.renovacoes ?? 0) + 1,
  };
}
