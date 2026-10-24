import { supabase } from "./supabase";

export function calcularDesconto(oferta) {
  if (!oferta.preco_antigo || oferta.preco_antigo <= oferta.preco_atual) return 0;
  return Math.round(((oferta.preco_antigo - oferta.preco_atual) / oferta.preco_antigo) * 100);
}

export const DIAS_NO_SITE = 5;

export function estaExpirada(oferta) {
  const agora = Date.now();
  if (oferta.expires_at && new Date(oferta.expires_at).getTime() < agora) return true;
  if (oferta.publicada_em) {
    return new Date(oferta.publicada_em).getTime() < agora - DIAS_NO_SITE * 24 * 60 * 60 * 1000;
  }
  return false;
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

// "KaBuM!" vira "kabum", "Mercado Livre" vira "mercado-livre"
export function slugDaLoja(nome) {
  return String(nome)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// As promoções da comunidade ficam só na aba delas, fora da vitrine principal
const SEM_COMUNIDADE = "origem.is.null,origem.neq.comunidade";

export async function buscarOfertas({
  categoria,
  relampago,
  termo,
  loja,
  comunidade = false,
  comCupom = false,
  limite = 60,
  
} = {}) {
  let consulta = supabase
    .from("ofertas")
    .select("*")
    .eq("ativa", true)
    .order("destaque", { ascending: false }) // ofertas em destaque primeiro
    .order("atualizado_em", { ascending: false })
    .limit(limite);

  if (comunidade) consulta = consulta.eq("origem", "comunidade");
  else consulta = consulta.or(SEM_COMUNIDADE);

  if (categoria) consulta = consulta.eq("categoria", categoria);
  if (relampago) consulta = consulta.eq("relampago", true);
  if (loja) consulta = consulta.eq("loja", loja);
  if (comCupom) consulta = consulta.not("cupom", "is", null);
  if (termo) consulta = consulta.ilike("titulo", `%${termo.replace(/[%_,]/g, " ")}%`);

  const { data, error } = await consulta;
  if (error) {
    console.error("Erro ao buscar ofertas:", error.message);
    return [];
  }
    const ofertas = (data ?? []).map((o) => ({ ...o, expirada: estaExpirada(o) }));
  // ativas primeiro, expiradas no fim (a ordem dentro de cada grupo é mantida)
  return [...ofertas.filter((o) => !o.expirada), ...ofertas.filter((o) => o.expirada)];
}

// Lojas com ofertas ativas, da que tem mais ofertas para a que tem menos
export async function buscarLojas(limite = 12) {
  const { data, error } = await supabase
    .from("lojas_com_ofertas")
    .select("loja, total")
    .order("total", { ascending: false })
    .limit(limite);
  if (error) {
    console.error("Erro ao buscar lojas:", error.message);
    return [];
  }
  return (data ?? []).map((l) => ({ nome: l.loja, slug: slugDaLoja(l.loja), total: l.total }));
}

export async function buscarCupons() {
  const hoje = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("cupons")
    .select("*")
    .eq("ativo", true)
    .or(`validade.is.null,validade.gte.${hoje}`)
    .order("criado_em", { ascending: false })
    .limit(60);
  if (error) {
    console.error("Erro ao buscar cupons:", error.message);
    return [];
  }
  return data ?? [];
}

export async function buscarOfertaPorId(id) {
  const { data, error } = await supabase
    .from("ofertas")
    .select("*")
    .eq("id", id)
    .eq("ativa", true)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar oferta:", error.message);
    return null;
  }
  if (!data) return null;
  return { ...data, expirada: estaExpirada(data) };
}