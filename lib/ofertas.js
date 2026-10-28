import { supabase } from "./supabase";
import { DIAS_NO_SITE } from "./prazos.mjs";

export { DIAS_NO_SITE };

export function calcularDesconto(oferta) {
  if (!oferta.preco_antigo || oferta.preco_antigo <= oferta.preco_atual) return 0;
  return Math.round(((oferta.preco_antigo - oferta.preco_atual) / oferta.preco_antigo) * 100);
}

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

// Traz primeiro as ofertas válidas (até "limite") e, depois delas, algumas expiradas
// (até "limiteExpiradas"), que ficam no fim da fila.
export async function buscarOfertas({
  categoria,
  relampago,
  termo,
  termos, // lista de palavras do título (Hardware, Monitores)
  loja,
  comunidade = false,
  comCupom = false,
  freteGratis = false,
  limite = 60,
  limiteExpiradas = 25,
} = {}) {
  const agoraIso = new Date().toISOString();
  const corte = new Date(Date.now() - DIAS_NO_SITE * 24 * 60 * 60 * 1000).toISOString();

  // Monta a consulta com todos os filtros pedidos
  const montar = () => {
    let consulta = supabase
      .from("ofertas")
      .select("*")
      .eq("ativa", true)
      .order("destaque", { ascending: false }) // ofertas em destaque primeiro
      .order("atualizado_em", { ascending: false });

    if (comunidade) consulta = consulta.eq("origem", "comunidade");
    else consulta = consulta.or(SEM_COMUNIDADE);

    if (categoria) {
      consulta = Array.isArray(categoria)
        ? consulta.in("categoria", categoria)
        : consulta.eq("categoria", categoria);
    }
    if (relampago) consulta = consulta.eq("relampago", true);
    if (loja) consulta = consulta.eq("loja", loja);
    if (comCupom) consulta = consulta.not("cupom", "is", null);
    if (freteGratis) consulta = consulta.eq("frete_gratis", true);
    if (termo) consulta = consulta.ilike("titulo", `%${termo.replace(/[%_,]/g, " ")}%`);
    if (termos && termos.length > 0) {
      consulta = consulta.or(termos.map((t) => `titulo.ilike.%${t}%`).join(","));
    }
    return consulta;
  };

  const [validas, vencidas] = await Promise.all([
    montar()
      .or(`expires_at.is.null,expires_at.gt.${agoraIso}`)
      .or(`publicada_em.is.null,publicada_em.gt.${corte}`)
      .limit(limite),
    limiteExpiradas > 0
      ? montar()
          .or(`expires_at.lt.${agoraIso},publicada_em.lt.${corte}`)
          .limit(limiteExpiradas)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (validas.error) {
    console.error("Erro ao buscar ofertas:", validas.error.message);
    return [];
  }
  if (vencidas.error) {
    console.error("Erro ao buscar ofertas expiradas:", vencidas.error.message);
  }

  const lista = [...(validas.data ?? []), ...(vencidas.data ?? [])].map((o) => ({
    ...o,
    expirada: estaExpirada(o),
  }));
  // ativas primeiro, expiradas no fim (a ordem dentro de cada grupo é mantida)
  return [...lista.filter((o) => !o.expirada), ...lista.filter((o) => o.expirada)];
}

// Mais procuradas e maiores descontos: ranking das ofertas ativas dos últimos dias.
// Pontos = desconto (%) + 2 por clique (até 50 cliques) + 30 se você marcou como destaque.
export async function buscarMaisProcuradas(limite = 12) {
  const desde = new Date(Date.now() - DIAS_NO_SITE * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("ofertas")
    .select("*")
    .eq("ativa", true)
    .or(SEM_COMUNIDADE)
    .gte("publicada_em", desde)
    .order("atualizado_em", { ascending: false })
    .limit(400);

  if (error) {
    console.error("Erro ao buscar mais procuradas:", error.message);
    return [];
  }

  return (data ?? [])
    .map((o) => ({ ...o, expirada: estaExpirada(o) }))
    .filter((o) => !o.expirada)
    .filter((o) => calcularDesconto(o) >= 15 || (o.cliques ?? 0) >= 3)
    .map((o) => ({
      oferta: o,
      pontos: calcularDesconto(o) + Math.min(o.cliques ?? 0, 50) * 2 + (o.destaque ? 30 : 0),
    }))
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, limite)
    .map((x) => x.oferta);
}

// Quantas ofertas ativas cada categoria tem (usado no menu Departamentos)
export async function buscarTotaisPorCategoria() {
  const totais = {};
  const POR_PAGINA = 1000;

  for (let de = 0; ; de += POR_PAGINA) {
    const { data, error } = await supabase
      .from("ofertas")
      .select("categoria, publicada_em, expires_at")
      .eq("ativa", true)
      .or(SEM_COMUNIDADE)
      .order("id")
      .range(de, de + POR_PAGINA - 1);

    if (error) {
      console.error("Erro ao buscar totais por categoria:", error.message);
      return totais;
    }

    for (const o of data ?? []) {
      if (!o.categoria || estaExpirada(o)) continue;
      totais[o.categoria] = (totais[o.categoria] ?? 0) + 1;
    }

    if (!data || data.length < POR_PAGINA) break;
  }

  return totais;
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