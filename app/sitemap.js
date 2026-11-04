// Mapa do site para o Google (fica em https://mukiofertas.com.br/sitemap.xml).
// Salve como app/sitemap.js. Se já existir um app/sitemap.xml (arquivo fixo), apague-o.
// Atualiza sozinho: páginas fixas, Black Friday, categorias com ofertas e as ofertas no ar.
// As ofertas expiradas e as sem detalhes próprios ficam de fora (elas também estão marcadas
// como "noindex"; regra em lib/indexacao.js). Os guias de compra entram todos.

import { supabase } from "../lib/supabase";
import { SITE } from "../lib/site";
import { categorias } from "../data/ofertas";
import { atalhos } from "../data/atalhos";
import { estaExpirada } from "../lib/ofertas";
import { guias } from "../data/guias";
import { deveIndexarOferta } from "../lib/indexacao";

export const revalidate = 3600; // refaz o mapa a cada 1 hora

const POR_PAGINA = 1000;
const MAX_OFERTAS = 10000;

export default async function sitemap() {
  const base = SITE.url.replace(/\/+$/, "");
  const agora = new Date();

  // Páginas fixas
  const fixas = [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/black-friday`, changeFrequency: "hourly", priority: 0.9 },
    ...atalhos
      .filter((a) => a.href !== "/" && !a.href.startsWith("/categoria/"))
      .map((a) => ({ url: `${base}${a.href}`, changeFrequency: "hourly", priority: 0.8 })),
    ...["/sobre", "/contato", "/privacidade", "/termos"].map((p) => ({
      url: `${base}${p}`,
      changeFrequency: "monthly",
      priority: 0.3,
    })),
  ].map((p) => ({ ...p, lastModified: agora }));

  // Ofertas ativas (em páginas de 1000, que é o máximo por consulta do Supabase)
  const lista = [];
  for (let de = 0; de < MAX_OFERTAS; de += POR_PAGINA) {
    const { data, error } = await supabase
      .from("ofertas")
      .select("id, categoria, atualizado_em, publicada_em, expires_at, origem, sobre, especificacoes")
      .eq("ativa", true)
      .order("id", { ascending: false })
      .range(de, de + POR_PAGINA - 1);
    if (error) {
      console.error("Erro ao montar o sitemap:", error.message);
      break;
    }
    lista.push(...(data ?? []));
    if (!data || data.length < POR_PAGINA) break;
  }

  const noAr = lista.filter((o) => !estaExpirada(o));

  // Categorias (e departamentos) que têm pelo menos uma oferta no ar
  const comOfertas = new Set(noAr.map((o) => o.categoria));
  for (const c of categorias) if (c.pai && comOfertas.has(c.slug)) comOfertas.add(c.pai);
  const paginasCategorias = categorias
    .filter((c) => comOfertas.has(c.slug))
    .map((c) => ({
      url: `${base}/categoria/${c.slug}`,
      lastModified: agora,
      changeFrequency: "daily",
      priority: c.pai ? 0.6 : 0.7,
    }));

  // Só as ofertas que o Google deve indexar (regra em lib/indexacao.js)
  const paginasOfertas = noAr
    .filter((o) => deveIndexarOferta(o, false))
    .map((o) => ({
      url: `${base}/oferta/${o.id}`,
      lastModified: o.atualizado_em ? new Date(o.atualizado_em) : agora,
      changeFrequency: "daily",
      priority: 0.5,
    }));

  // Guias de compra (conteúdo próprio do site)
  const paginasGuias = guias.map((g) => ({
    url: `${base}/guias/${g.slug}`,
    lastModified: new Date(`${g.atualizadoEm}T12:00:00-03:00`),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...fixas, ...paginasGuias, ...paginasCategorias, ...paginasOfertas];
}