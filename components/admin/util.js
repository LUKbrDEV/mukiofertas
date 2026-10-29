// Funções usadas por várias telas do painel admin.
// Salve como components/admin/util.js.

import { categorias } from "../../data/ofertas";
import { DIAS_NO_SITE } from "../../lib/prazos.mjs";

export const DIA = 86400000;

export const nomeCategoria = (slug) => categorias.find((c) => c.slug === slug)?.nome ?? slug ?? "—";

export const NOMES_ORIGEM = {
  automatica: "Robô (Lomadee)",
  telegram: "Telegram",
  manual: "Manual",
  comunidade: "Comunidade",
};
export const nomeOrigem = (o) => NOMES_ORIGEM[o ?? "automatica"] ?? o;

// Busca todas as linhas de uma tabela, de 1000 em 1000 (o Supabase devolve no máximo 1000 por vez)
export async function buscarTudo(consulta, maximo = 6000) {
  const linhas = [];
  for (let inicio = 0; inicio < maximo; inicio += 1000) {
    const { data, error } = await consulta().range(inicio, inicio + 999);
    if (error) return { data: linhas, error };
    linhas.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return { data: linhas, error: null };
}

// Momento em que a oferta expira (mesma regra do site)
export function momentoExpiracao(o) {
  const prazos = [];
  if (o.expires_at) prazos.push(new Date(o.expires_at).getTime());
  if (o.publicada_em) prazos.push(new Date(o.publicada_em).getTime() + DIAS_NO_SITE * DIA);
  return prazos.length ? Math.min(...prazos) : null;
}

// "2 dias", "5 horas", "20 min"
export function duracao(ms) {
  if (ms >= DIA) {
    const d = Math.round(ms / DIA);
    return `${d} ${d === 1 ? "dia" : "dias"}`;
  }
  if (ms >= 3600000) {
    const h = Math.round(ms / 3600000);
    return `${h} ${h === 1 ? "hora" : "horas"}`;
  }
  return `${Math.max(1, Math.round(ms / 60000))} min`;
}

// "há 3 horas" / "nunca"
export function ha(dataIso) {
  if (!dataIso) return "nunca";
  const ms = Date.now() - new Date(dataIso).getTime();
  if (ms < 60000) return "agora mesmo";
  return `há ${duracao(ms)}`;
}

export function dataHora(dataIso) {
  if (!dataIso) return "—";
  return new Date(dataIso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Data no formato AAAA-MM-DD no horário de Brasília
export const diaSP = (data) => new Date(data).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

export function ultimosDias(quantidade) {
  const agora = Date.now();
  const dias = [];
  for (let i = quantidade - 1; i >= 0; i--) dias.push(diaSP(agora - i * DIA));
  return dias;
}

// Título simplificado, para achar ofertas repetidas
export const tituloBase = (t) =>
  String(t ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Lista de barras horizontais (lojas, categorias...)
export function Barras({ itens, vazio = "Nada por aqui ainda." }) {
  if (!itens.length) return <p className="adm-vazio">{vazio}</p>;
  const maior = Math.max(1, ...itens.map((i) => i.total));
  return (
    <ul className="adm-barras">
      {itens.map((i) => (
        <li key={i.nome}>
          <span className="adm-barras-nome" title={i.nome}>
            {i.nome}
          </span>
          <span className="adm-barras-trilho">
            <span className="adm-barras-valor" style={{ width: `${(i.total / maior) * 100}%` }} />
          </span>
          <strong>{i.total}</strong>
        </li>
      ))}
    </ul>
  );
}

// Gráfico de colunas por dia
export function Colunas({ dias, rotulo = "itens" }) {
  const maior = Math.max(1, ...dias.map((d) => d.total));
  return (
    <div className="adm-grafico">
      {dias.map((d) => (
        <div key={d.dia} className="adm-barra-wrap" title={`${d.dia.split("-").reverse().join("/")}: ${d.total} ${rotulo}`}>
          <span className="adm-barra-num">{d.total || ""}</span>
          <div className="adm-barra-area">
            <div className="adm-barra" style={{ height: `${(d.total / maior) * 100}%` }} />
          </div>
          <span>{d.dia.slice(8, 10)}</span>
        </div>
      ))}
    </div>
  );
}

// Conta por chave e devolve [{nome, total}] do maior para o menor
export function contarPor(lista, chave, limite = 10) {
  const mapa = new Map();
  for (const item of lista) {
    const k = chave(item);
    if (!k) continue;
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return [...mapa.entries()]
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limite);
}
