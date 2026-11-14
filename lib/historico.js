// Histórico de preço (tabela historico_ofertas, criada pelo supabase-melhorias.sql).
// Salve como lib/historico.js. Usado pela página do produto (app/oferta/[id]/page.js).
// O banco grava sozinho uma linha sempre que o preço muda (gatilho ofertas_historico_preco).
//
// HISTÓRICO DO PRODUTO (não só da oferta): o mesmo produto costuma voltar ao site várias vezes,
// cada vez como uma oferta nova (id novo). Para o histórico não "recomeçar do zero" a cada repostagem,
// juntamos todas as ofertas da mesma loja com o mesmo código do produto (id_externo: ASIN da Amazon,
// MLB do Mercado Livre, item da Shopee...) nos últimos 90 dias.

import { supabase } from "./supabase";

const DIA = 86400000;

// Histórico de UMA oferta (como era antes; continua disponível)
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

// Histórico do PRODUTO: junta as ofertas da mesma loja com o mesmo código do produto.
// Devolve { pontos, vezes } — vezes = em quantas ofertas diferentes o produto apareceu no período.
export async function buscarHistoricoProduto(oferta, dias = 90) {
  const desde = new Date(Date.now() - dias * DIA).toISOString();
  let irmas = [{ id: oferta.id, preco_atual: oferta.preco_atual, publicada_em: oferta.publicada_em }];

  if (oferta.id_externo && oferta.loja) {
    const { data, error } = await supabase
      .from("ofertas")
      .select("id, preco_atual, publicada_em")
      .eq("loja", oferta.loja)
      .eq("id_externo", oferta.id_externo)
      .gte("publicada_em", desde)
      .order("publicada_em", { ascending: true })
      .limit(60);
    if (!error && data?.length) {
      irmas = data.some((o) => o.id === oferta.id) ? data : [...data, irmas[0]];
    }
  }

  const ids = irmas.map((o) => o.id);
  const { data: linhas, error } = await supabase
    .from("historico_ofertas")
    .select("oferta_id, preco, registrado_em")
    .in("oferta_id", ids)
    .gte("registrado_em", desde)
    .order("registrado_em", { ascending: true })
    .limit(1000);
  if (error) return { pontos: [], vezes: irmas.length }; // tabela ainda não criada

  const pontos = (linhas ?? []).map((p) => ({ preco: Number(p.preco), em: new Date(p.registrado_em).getTime() }));
  // Oferta antiga sem nenhuma mudança de preço registrada: entra o preço dela no dia em que foi publicada
  const comRegistro = new Set((linhas ?? []).map((l) => l.oferta_id));
  for (const o of irmas) {
    if (o.id === oferta.id || comRegistro.has(o.id) || !o.publicada_em || !(Number(o.preco_atual) > 0)) continue;
    const em = new Date(o.publicada_em).getTime();
    if (em >= Date.now() - dias * DIA) pontos.push({ preco: Number(o.preco_atual), em });
  }
  pontos.sort((a, b) => a.em - b.em);
  return { pontos, vezes: irmas.length };
}

// Resumo para o selo, o gráfico e o texto da análise.
// O selo "Menor preço em 30 dias" só aparece quando já existe histórico de pelo menos 7 dias
// (senão toda oferta nova seria "o menor preço", o que não é verdade).
export function resumirHistorico(pontos, precoAtual, agora = Date.now(), { vezes = 1 } = {}) {
  if (!pontos.length) return null;
  const atual = Number(precoAtual);
  const todos = [...pontos, { preco: atual, em: agora }];
  const menorPonto = todos.reduce((m, p) => (p.preco < m.preco - 0.009 ? p : m), todos[0]);
  const maiorPonto = todos.reduce((m, p) => (p.preco > m.preco + 0.009 ? p : m), todos[0]);
  const menor = menorPonto.preco;
  const maior = maiorPonto.preco;
  const ultimos30 = pontos.filter((p) => p.em >= agora - 30 * DIA).map((p) => p.preco);
  const menor30 = ultimos30.length ? Math.min(...ultimos30) : menor;
  const diasDeHistorico = (agora - pontos[0].em) / DIA;
  const media = todos.reduce((t, p) => t + p.preco, 0) / todos.length;
  return {
    menor,
    maior,
    // quando o menor/maior preço foi visto pela primeira vez (o preço de agora conta como "hoje")
    menorEm: menorPonto.em,
    maiorEm: maiorPonto.em,
    media,
    vezes,
    diasDeHistorico,
    menorPreco30: diasDeHistorico >= 7 && atual <= menor30 + 0.009,
    noMenorPreco: atual <= menor + 0.009 && maior - menor > 0.009,
    abaixoDoMaior: maior > atual ? Math.round(((maior - atual) / maior) * 100) : 0,
    acimaDoMenor: atual > menor ? atual - menor : 0,
  };
}
