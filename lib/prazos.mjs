// Prazos e regras de expiração das ofertas (um só lugar para ajustar)
export const DIAS_NO_SITE = 3; // depois disso a oferta fica como "Expirado" e desce para o fim
export const DIAS_EXPIRADA_VISIVEL = 5; // depois de expirada, fica visível por mais 5 dias e é apagada
export const DIAS_BLOQUEIO_REPUBLICAR = 20; // oferta apagada não é publicada de novo pelo coletor nesse período
export const HORAS_ATE_CONFERIR_PRECO = 24; // a partir daqui o preço passa a ser conferido
export const TOLERANCIA_PRECO = 0.05; // diferença de até 10% não conta como mudança de preço

export function precoMudou(precoAntigo, precoNovo) {
  const a = Number(precoAntigo);
  const n = Number(precoNovo);
  if (!a || !n) return false;
  return Math.abs(n - a) / a > TOLERANCIA_PRECO;
}