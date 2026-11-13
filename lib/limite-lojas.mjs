// Limite de ofertas NO AR por loja (Shopee, Amazon e Mercado Livre).
// Salve como lib/limite-lojas.mjs. Usado pelo scripts/coletar.mjs (a cada 30 min) e pelo
// scripts/fila-mercadolivre.mjs (para saber quantas vagas o ML ainda tem).
//
// Conta a loja por TODOS os nomes que ela aparece ("Shopee", "Shopee Brasil"...), igual à aba do site.
// Passou do limite? Expira o excesso: primeiro as que não são das categorias prioritárias,
// das mais antigas para as mais novas. Expirar = fica com a tag "Expirado" e desce para o fim (não apaga).

import { ehPrioritaria } from "./qualidade.mjs";
import { DIAS_NO_SITE } from "./prazos.mjs";

// ===== AJUSTES =====
export const LIMITES_POR_LOJA = [
  { nome: "Shopee", padrao: /shopee/i, maximo: 300 },
  { nome: "Amazon", padrao: /amazon/i, maximo: 300 },
  { nome: "Mercado Livre", padrao: /mercado\s*livre/i, maximo: 500 }, // meta: 400 a 500 no ar
];
// ===================

const filtroNome = (l) => (l.nome === "Mercado Livre" ? "loja.ilike.%mercado%livre%" : `loja.ilike.%${l.nome.toLowerCase()}%`);

// Ofertas da loja que estão no ar agora (mesma regra da aba: publicada nos últimos dias e não vencida)
export async function ofertasNoAr(db, limite) {
  const agora = new Date().toISOString();
  const corte = new Date(Date.now() - DIAS_NO_SITE * 86400000).toISOString();
  const lista = [];
  for (let de = 0; de < 20000; de += 1000) {
    const { data, error } = await db
      .from("ofertas")
      .select("id, loja, categoria, publicada_em")
      .eq("ativa", true)
      .or(filtroNome(limite))
      .gte("publicada_em", corte)
      .or(`expires_at.is.null,expires_at.gt.${agora}`)
      .order("id")
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    lista.push(...(data ?? []).filter((o) => limite.padrao.test(o.loja ?? "")));
    if (!data || data.length < 1000) break;
  }
  return lista;
}

// Quantas vagas a loja ainda tem (ex.: vagasDaLoja(db, "Mercado Livre") → 120)
export async function vagasDaLoja(db, nome) {
  const limite = LIMITES_POR_LOJA.find((l) => l.nome === nome);
  if (!limite) return Infinity;
  try {
    return Math.max(0, limite.maximo - (await ofertasNoAr(db, limite)).length);
  } catch {
    return Infinity; // sem conseguir contar, não trava a publicação (a limpeza da coleta corrige depois)
  }
}

// Expira o excesso de cada loja. Devolve um resumo, ex.: "Shopee 372→300 (72 expiradas)"
export async function aplicarLimitesDeLoja(db, { teste = false } = {}) {
  const resumo = [];
  for (const limite of LIMITES_POR_LOJA) {
    let lista;
    try {
      lista = await ofertasNoAr(db, limite);
    } catch (e) {
      resumo.push(`${limite.nome}: erro ao contar (${e.message})`);
      continue;
    }
    const excesso = lista.length - limite.maximo;
    if (excesso <= 0) continue;
    lista.sort(
      (a, b) =>
        Number(ehPrioritaria(a.categoria)) - Number(ehPrioritaria(b.categoria)) ||
        new Date(a.publicada_em) - new Date(b.publicada_em)
    );
    const cortar = lista.slice(0, excesso).map((o) => o.id);
    let feitas = 0;
    if (!teste) {
      const agora = new Date().toISOString();
      for (let i = 0; i < cortar.length; i += 200) {
        const { error } = await db.from("ofertas").update({ expires_at: agora }).in("id", cortar.slice(i, i + 200));
        if (!error) feitas += Math.min(200, cortar.length - i);
      }
    }
    resumo.push(`${limite.nome} ${lista.length}→${limite.maximo} (${teste ? cortar.length + " sairiam" : feitas + " expiradas"})`);
  }
  return resumo.join(", ");
}
