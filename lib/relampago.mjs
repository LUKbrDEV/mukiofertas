// Promoção relâmpago de verdade: oferta com hora para acabar.
// Salve como lib/relampago.mjs. Usado pelo lib/salvar-oferta.js (postagens do Telegram),
// pelo painel admin e pelas telas do site.
//
// Como nas grandes lojas (Amazon, Mercado Livre, Shopee), relâmpago é TEMPO CURTO, não desconto alto.
// O desconto alto agora é a tag "Super desconto" (regra do painel, calculada pelo banco).

export const HORAS_RELAMPAGO_PADRAO = 6; // a Oferta Relâmpago da Amazon dura no máximo umas 6 horas

const HORA = 3600000;

// A oferta está em relâmpago agora? (tem relampago_ate no futuro)
export function ehRelampago(oferta, agora = Date.now()) {
  return Boolean(oferta?.relampago_ate) && new Date(oferta.relampago_ate).getTime() > agora;
}

// Hora "HH:MM" de hoje (ou de amanhã, se já passou) no horário de Brasília
function horaDeHoje(h, m, agora) {
  const brasilia = new Date(agora - 3 * HORA); // UTC-3 (o Brasil não tem horário de verão desde 2019)
  const alvo = Date.UTC(brasilia.getUTCFullYear(), brasilia.getUTCMonth(), brasilia.getUTCDate(), h, m) + 3 * HORA;
  return alvo > agora ? alvo : alvo + 24 * HORA;
}

// Lê a postagem e devolve até quando o relâmpago vale (ISO) — ou null se não for relâmpago.
// Entende, por exemplo:
//   "⚡ OFERTA RELÂMPAGO"                 → agora + 6 horas
//   "Relâmpago! Termina às 18h"           → hoje às 18:00
//   "relampago até as 23:59"              → hoje às 23:59
//   "flash sale, acaba em 2 horas"        → agora + 2 horas
//   "relâmpago por 30 minutos"            → agora + 30 min
export function detectarRelampago(texto, { agora = Date.now(), horasPadrao = HORAS_RELAMPAGO_PADRAO } = {}) {
  const t = String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  if (!/\brelampago\b|flash\s*sale/.test(t)) return null;

  // "termina/acaba/até (as) 18h", "18:30", "18h30"
  const hora = t.match(/(?:termina|acaba|encerra|vai\s+ate|valida\s+ate|ate)\s*(?:as|às|a)?\s*(\d{1,2})\s*(?:h|:)\s*(\d{2})?/);
  if (hora) {
    const h = Number(hora[1]);
    const m = Number(hora[2] ?? 0);
    if (h <= 23 && m <= 59) return new Date(horaDeHoje(h, m, agora)).toISOString();
  }

  // "acaba em 2 horas", "por 3h", "por 30 minutos", "restam 45 min"
  const duracao = t.match(/(?:em|por|restam|faltam|durante)\s*(\d{1,3})\s*(horas?|h\b|minutos?|min\b)/);
  if (duracao) {
    const n = Number(duracao[1]);
    const ms = /^h/.test(duracao[2]) ? n * HORA : n * 60000;
    if (n > 0 && ms <= 48 * HORA) return new Date(agora + ms).toISOString();
  }

  return new Date(agora + horasPadrao * HORA).toISOString();
}

// Texto curto do tempo que falta: "2h 15min", "45min", "38s"
export function tempoQueFalta(ate, agora = Date.now()) {
  const ms = new Date(ate).getTime() - agora;
  if (!(ms > 0)) return null;
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`;
  if (m > 0) return `${m}min ${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}s`;
  return `${Math.floor(ms / 1000)}s`;
}
