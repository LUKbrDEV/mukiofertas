import { categorias } from "../data/ofertas";
import { supabase } from "../lib/supabase";
import { SITE } from "../lib/site";

export const revalidate = 3600; // atualiza a cada hora

export default async function sitemap() {
  const agora = new Date();

  const fixas = [
    { rota: "", prioridade: 1, frequencia: "hourly" },
    { rota: "/cupons", prioridade: 0.7, frequencia: "daily" },
    { rota: "/comunidade", prioridade: 0.6, frequencia: "daily" },
    { rota: "/sobre", prioridade: 0.3, frequencia: "yearly" },
    { rota: "/contato", prioridade: 0.3, frequencia: "yearly" },
    { rota: "/privacidade", prioridade: 0.2, frequencia: "yearly" },
    { rota: "/termos", prioridade: 0.2, frequencia: "yearly" },
  ].map((p) => ({
    url: `${SITE.url}${p.rota}`,
    lastModified: agora,
    changeFrequency: p.frequencia,
    priority: p.prioridade,
  }));

  const categoriasUrls = categorias.map((c) => ({
    url: `${SITE.url}/categoria/${c.slug}`,
    lastModified: agora,
    changeFrequency: "hourly",
    priority: 0.8,
  }));

  let ofertasUrls = [];
  const { data, error } = await supabase
    .from("ofertas")
    .select("id, atualizado_em")
    .eq("ativa", true)
    .order("atualizado_em", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Erro ao montar o sitemap:", error.message);
  } else {
    ofertasUrls = (data ?? []).map((o) => ({
      url: `${SITE.url}/oferta/${o.id}`,
      lastModified: new Date(o.atualizado_em),
      changeFrequency: "daily",
      priority: 0.6,
    }));
  }

  return [...fixas, ...categoriasUrls, ...ofertasUrls];
}