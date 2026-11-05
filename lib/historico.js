// Histórico de preço de uma oferta (tabela historico_ofertas, criada pelo supabase-melhorias.sql).
// Salve como lib/historico.js. Usado pela página do produto (app/oferta/[id]/page.js).
// O banco grava sozinho uma linha sempre que o preço muda (gatilho ofertas_historico_preco).

import { supabase } from "./supabase";

const DIA = 86400000;

export async function buscarHistorico(ofertaId, dias = 90) {
  const desde = new Date(Date.now() - dias * DIA).toISOString();
  const { data, error } = await supabase
    .from("historico_ofertas")
    .select("preco, registrado_em")
    .eq("oferta_id", ofertaId)
    .gte("registrado_em", desde)
    .order("registrado_em", { ascending: true })
    .limit(500);
  if (error) return []; // tabela ainda não criada: a página segue sem o gráfico
  return (data ?? []).map((p) => ({ preco: Number(p.preco), em: new Date(p.registrado_em).getTime() }));
}

// Resumo para o selo e o texto abaixo do gráfico.
// O selo "Menor preço em 30 dias" só aparece quando já existe histórico de pelo menos 7 dias
// (senão toda oferta nova seria "o menor preço", o que não é verdade).
export function resumirHistorico(pontos, precoAtual, agora = Date.now()) {
  if (!pontos.length) return null;
  const precos = pontos.map((p) => p.preco);
  const menor = Math.min(...precos, Number(precoAtual));
  const maior = Math.max(...precos, Number(precoAtual));
  const ultimos30 = pontos.filter((p) => p.em >= agora - 30 * DIA).map((p) => p.preco);
  const menor30 = ultimos30.length ? Math.min(...ultimos30) : menor;
  const diasDeHistorico = (agora - pontos[0].em) / DIA;
  const atual = Number(precoAtual);
  return {
    menor,
    maior,
    diasDeHistorico,
    menorPreco30: diasDeHistorico >= 7 && atual <= menor30 + 0.009,
    abaixoDoMaior: maior > atual ? Math.round(((maior - atual) / maior) * 100) : 0,
  };
}
