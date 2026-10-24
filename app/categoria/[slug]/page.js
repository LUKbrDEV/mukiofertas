import { notFound } from "next/navigation";
import ListaOfertas from "../../../components/ListaOfertas";
import { categorias } from "../../../data/ofertas";
import { buscarOfertas } from "../../../lib/ofertas";

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

export default async function PaginaCategoria({ params }) {
  const { slug } = await params;
  const categoria = categorias.find((c) => c.slug === slug);
  if (!categoria) notFound();

  const ofertas = await buscarOfertas({ categoria: slug });

  return (
    <>
      <h1 className="titulo-pagina">{categoria.nome}</h1>
      <p className="subtitulo-pagina">Ofertas mais recentes nesta categoria</p>
      <ListaOfertas
        ofertas={ofertas}
        vazio="Nenhuma oferta nesta categoria agora. Novas ofertas aparecem assim que forem encontradas."
      />
    </>
  );
}