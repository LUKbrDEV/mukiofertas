import { notFound } from "next/navigation";
import CardOferta from "../../../components/CardOferta";
import { categorias } from "../../../data/ofertas";
import { supabase } from "../../../lib/supabase";

export const revalidate = 60;

export default async function PaginaCategoria({ params }) {
  const { slug } = await params;
  const categoria = categorias.find((c) => c.slug === slug);
  if (!categoria) notFound();

  const { data: lista = [] } = await supabase
    .from("ofertas")
    .select("*")
    .eq("categoria", slug)
    .eq("ativa", true)
    .order("atualizado_em", { ascending: false });

  return (
    <section>
      <h2>{categoria.emoji} {categoria.nome}</h2>
      {lista.length === 0 ? (
        <p>Nenhuma oferta nesta categoria por enquanto.</p>
      ) : (
        <div className="grade">
          {lista.map((o) => <CardOferta key={o.id} oferta={o} />)}
        </div>
      )}
    </section>
  );
}