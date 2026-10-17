import { supabase } from "./supabase";

export function calcularDesconto(oferta) {
  if (!oferta.preco_antigo || oferta.preco_antigo <= oferta.preco_atual) return 0;
  return Math.round(((oferta.preco_antigo - oferta.preco_atual) / oferta.preco_antigo) * 100);
}

export function nivelDoDesconto(desconto) {
  if (desconto >= 50) return "alto";
  if (desconto >= 30) return "medio";
  return "baixo";
}

export function formatarPreco(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function tempoAtras(dataIso) {
  const segundos = Math.round((new Date(dataIso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(segundos);
  const formato = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  if (abs < 3600) return formato.format(Math.round(segundos / 60), "minute");
  if (abs < 86400) return formato.format(Math.round(segundos / 3600), "hour");
  return formato.format(Math.round(segundos / 86400), "day");
}

export async function buscarOfertas({ categoria, relampago, termo, limite = 60 } = {}) {
  let consulta = supabase
    .from("ofertas")
    .select("*")
    .eq("ativa", true)
    .order("atualizado_em", { ascending: false })
    .limit(limite);

  if (categoria) consulta = consulta.eq("categoria", categoria);
  if (relampago) consulta = consulta.eq("relampago", true);
  if (termo) consulta = consulta.ilike("titulo", `%${termo.replace(/[%_,]/g, " ")}%`);

  const { data, error } = await consulta;
  if (error) {
    console.error("Erro ao buscar ofertas:", error.message);
    return [];
  }
  return data ?? [];
}