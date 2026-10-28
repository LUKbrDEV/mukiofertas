import { Suspense } from "react";
import { notFound } from "next/navigation";
import ListaOfertas from "../../../components/ListaOfertas";
import OrdenarOfertas from "../../../components/OrdenarOfertas";
import { categorias } from "../../../data/ofertas";
import { buscarOfertas } from "../../../lib/ofertas";
import { ordenarOfertas } from "../../../lib/ordenar";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const categoria = categorias.find((c) => c.slug === slug);
  if (!categoria) return {};
  return {
    title: `${categoria.nome} em promoção | MukiOfertas`,
    description: `As melhores promoções de ${categoria.nome} nas maiores lojas do Brasil, atualizadas o dia todo.`,
    alternates: { canonical: `/categoria/${slug}` },
  };
}

export default async function PaginaCategoria({ params, searchParams }) {
  const { slug } = await params;
  const { ordem } = await searchParams;
  const categoria = categorias.find((c) => c.slug === slug);
  if (!categoria) notFound();

  // Busca mais ofertas para a ordenação valer sobre uma lista maior
  const ofertas = ordenarOfertas(await buscarOfertas({ categoria: slug, limite: 120 }), ordem);
  const noAr = ofertas.filter((o) => !o.expirada).length;

  return (
    <>
      <div className="secao-cabecalho" style={{ alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h1 className="titulo-pagina">{categoria.nome}</h1>
          <p className="subtitulo-pagina" style={{ marginBottom: 0 }}>
            {noAr > 0
              ? `${noAr} ${noAr === 1 ? "oferta" : "ofertas"} no ar nesta categoria`
              : "Ofertas mais recentes nesta categoria"}
          </p>
        </div>
        {ofertas.length > 1 && (
          <Suspense fallback={null}>
            <OrdenarOfertas />
          </Suspense>
        )}
      </div>
      <ListaOfertas
        ofertas={ofertas}
        vazio="Nenhuma oferta nesta categoria agora. Novas ofertas aparecem assim que forem encontradas."
      />
    </>
  );
}