import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ListaOfertas from "../../../components/ListaOfertas";
import OrdenarOfertas from "../../../components/OrdenarOfertas";
import { categorias } from "../../../data/ofertas";
import { buscarOfertas } from "../../../lib/ofertas";
import { ordenarOfertas } from "../../../lib/ordenar";
import { slugsDaCategoria, paiDe } from "../../../lib/departamentos";
import { seoDaCategoria } from "../../../lib/seo-categorias";
import { SITE } from "../../../lib/site";
import { lojaPorSlug } from "../../../data/lojas";

export const revalidate = 60;

const CSS = `
  .cat-trilha { margin: 0 0 6px; font-size: 0.9rem; font-weight: 600; color: var(--tinta-suave); }
  .cat-trilha a:hover { color: var(--tinta); text-decoration: underline; }
  .cat-filtro-loja {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin: 10px 0 0;
    padding: 6px 8px 6px 6px;
    font-size: 0.88rem;
    font-weight: 700;
    color: #0f172a;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
  }
  .cat-filtro-loja img { display: block; height: 26px; width: auto; padding: 3px 10px; border-radius: 999px; }
  .cat-filtro-loja a { color: #0a4bb8; text-decoration: underline; }
  .cat-intro { max-width: 860px; margin: 6px 0 0; font-size: 0.95rem; line-height: 1.55; color: var(--tinta-suave); }
`;

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  const { loja: slugLoja } = await searchParams;
  const categoria = categorias.find((c) => c.slug === slug);
  if (!categoria) return { title: "Categoria não encontrada | MukiOfertas", robots: { index: false } };

  const seo = seoDaCategoria(categoria);
  const loja = lojaPorSlug(slugLoja);
  return {
    title: loja ? `${categoria.nome} ${loja.artigo} ${loja.nome} em promoção | MukiOfertas` : seo.titulo,
    // a versão filtrada por loja não entra no Google (a página principal da categoria é a que vale)
    ...(loja ? { robots: { index: false, follow: true } } : {}),
    description: seo.descricao,
    alternates: { canonical: `/categoria/${slug}` },
    openGraph: {
      type: "website",
      siteName: SITE.nome,
      locale: "pt_BR",
      title: seo.titulo,
      description: seo.descricao,
      url: `/categoria/${slug}`,
      images: [{ url: "/logo-mukiofertas.png", alt: "MukiOfertas" }],
    },
  };
}

export default async function PaginaCategoria({ params, searchParams }) {
  const { slug } = await params;
  const { ordem, loja: slugLoja } = await searchParams;
  const loja = lojaPorSlug(slugLoja); // ?loja=shopee mostra só as ofertas dessa loja
  const categoria = categorias.find((c) => c.slug === slug);
  if (!categoria) notFound();

  const pai = paiDe(categorias, categoria);
  const seo = seoDaCategoria(categoria);

  // Departamento com subcategorias mostra tudo junto (ex.: Hardware = hardware + SSD + placa-mãe...)
  const ofertas = ordenarOfertas(
    await buscarOfertas({
      categoria: slugsDaCategoria(categorias, slug),
      loja: loja ? loja.nomesNoBanco : undefined,
      limite: 120,
    }),
    ordem
  );
  const noAr = ofertas.filter((o) => !o.expirada);

  // Dados estruturados: caminho da página e lista das ofertas, para o Google entender a página
  const base = SITE.url.replace(/\/+$/, "");
  const trilha = [
    { nome: "Início", url: `${base}/` },
    ...(pai ? [{ nome: pai.nome, url: `${base}/categoria/${pai.slug}` }] : []),
    { nome: categoria.nome, url: `${base}/categoria/${slug}` },
  ];
  const dadosEstruturados = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: trilha.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.nome, item: t.url })),
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${categoria.nome} em promoção`,
      itemListElement: noAr.slice(0, 30).map((o, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${base}/oferta/${o.id}`,
        name: o.titulo,
      })),
    },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados).replace(/</g, "\\u003c") }}
      />

      <nav className="cat-trilha" aria-label="Você está em">
        <Link href="/">Início</Link>
        {pai && (
          <>
            {" › "}
            <Link href={`/categoria/${pai.slug}`}>{pai.nome}</Link>
          </>
        )}
        {" › "}
        {categoria.nome}
      </nav>

      <div className="secao-cabecalho" style={{ alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h1 className="titulo-pagina">
            {categoria.nome} em promoção{loja ? ` ${loja.artigo} ${loja.nome}` : ""}
          </h1>
          <p className="subtitulo-pagina" style={{ marginBottom: 0 }}>
            {noAr.length > 0
              ? `${noAr.length} ${noAr.length === 1 ? "oferta" : "ofertas"} no ar nesta categoria`
              : "Ofertas mais recentes nesta categoria"}
          </p>
          {loja && (
            <p className="cat-filtro-loja">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={loja.logo} alt={loja.nome} style={{ background: loja.cor }} />
              Só ofertas {loja.artigo} {loja.nome}
              <Link href={`/categoria/${slug}${ordem ? `?ordem=${ordem}` : ""}`}>ver de todas as lojas</Link>
            </p>
          )}
          <p className="cat-intro">{seo.intro}</p>
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
