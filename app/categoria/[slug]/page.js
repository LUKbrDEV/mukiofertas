import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ListaOfertas from "../../../components/ListaOfertas";
import OrdenarOfertas from "../../../components/OrdenarOfertas";
import { categorias } from "../../../data/ofertas";
import { buscarOfertas } from "../../../lib/ofertas";
import { ordenarOfertas } from "../../../lib/ordenar";
import { slugsDaCategoria, paiDe } from "../../../lib/departamentos";

export const revalidate = 60;

const CSS = `
  .cat-trilha { margin: 0 0 6px; font-size: 0.9rem; font-weight: 600; color: var(--tinta-suave); }
  .cat-trilha a:hover { color: var(--tinta); text-decoration: underline; }
`;

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

  const pai = paiDe(categorias, categoria);

  // Departamento com subcategorias mostra tudo junto (ex.: Hardware = hardware + SSD + placa-mãe...)
  const ofertas = ordenarOfertas(
    await buscarOfertas({ categoria: slugsDaCategoria(categorias, slug), limite: 120 }),
    ordem
  );
  const noAr = ofertas.filter((o) => !o.expirada).length;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {pai && (
        <p className="cat-trilha">
          <Link href={`/categoria/${pai.slug}`}>{pai.nome}</Link> › {categoria.nome}
        </p>
      )}

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