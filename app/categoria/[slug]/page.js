import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ListaOfertas from "../../../components/ListaOfertas";
import OrdenarOfertas from "../../../components/OrdenarOfertas";
import { categorias } from "../../../data/ofertas";
import { buscarOfertas, encontrarLoja } from "../../../lib/ofertas";
import { ordenarOfertas } from "../../../lib/ordenar";
import { slugsDaCategoria, paiDe } from "../../../lib/departamentos";
import { seoDaCategoria } from "../../../lib/seo-categorias";
import { SITE } from "../../../lib/site";

export const revalidate = 60;

const POR_PAGINA = 96; // ofertas por página

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
  .cat-paginas { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px; margin: 28px 0 8px; }
  .cat-paginas a, .cat-paginas span {
    display: inline-grid;
    place-items: center;
    min-width: 42px;
    height: 42px;
    padding: 0 14px;
    font-weight: 700;
    color: #0f172a;
    text-decoration: none;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
  }
  .cat-paginas a:hover { border-color: #ff7a1a; color: #ff6a00; }
  .cat-paginas [aria-current="page"] { color: #fff; background: #ff6a00; border-color: #ff6a00; }
  .cat-intro { max-width: 860px; margin: 6px 0 0; font-size: 0.95rem; line-height: 1.55; color: var(--tinta-suave); }
`;

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  const { loja: slugLoja } = await searchParams;
  const categoria = categorias.find((c) => c.slug === slug);
  if (!categoria) return { title: "Categoria não encontrada | MukiOfertas", robots: { index: false } };

  const seo = seoDaCategoria(categoria);
  const loja = await encontrarLoja(slugLoja);
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
  const { ordem, loja: slugLoja, pagina: paginaPedida } = await searchParams;
  const loja = await encontrarLoja(slugLoja); // ?loja=shopee mostra só as ofertas dessa loja
  const categoria = categorias.find((c) => c.slug === slug);
  if (!categoria) notFound();

  const pai = paiDe(categorias, categoria);
  const seo = seoDaCategoria(categoria);

  // Departamento com subcategorias mostra tudo junto (ex.: Hardware = hardware + SSD + placa-mãe...)
  // Busca TODAS as ofertas no ar da categoria (antes eram só as 120 primeiras, por isso o
  // número da página não batia com o do menu). A ordem vale para todas e depois divide em páginas.
  const todas = ordenarOfertas(
    await buscarOfertas({
      categoria: slugsDaCategoria(categorias, slug),
      loja: loja ? loja.nomesNoBanco : undefined,
      limite: 1000,
      limiteExpiradas: 25,
    }),
    ordem
  );
  const noAr = todas.filter((o) => !o.expirada);
  const expiradas = todas.filter((o) => o.expirada);
  const totalPaginas = Math.max(1, Math.ceil(noAr.length / POR_PAGINA));
  const pagina = Math.min(totalPaginas, Math.max(1, parseInt(paginaPedida, 10) || 1));
  // as expiradas aparecem só no fim da última página
  const ofertas = [
    ...noAr.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    ...(pagina === totalPaginas ? expiradas : []),
  ];

  // Endereço de outra página, mantendo a ordem e o filtro de loja
  const linkPagina = (n) => {
    const p = new URLSearchParams();
    if (ordem) p.set("ordem", ordem);
    if (loja) p.set("loja", loja.slug);
    if (n > 1) p.set("pagina", String(n));
    const q = p.toString();
    return `/categoria/${slug}${q ? `?${q}` : ""}`;
  };

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
              {loja.logo && <img src={loja.logo} alt={loja.nome} style={{ background: loja.cor }} />}
              Só ofertas {loja.artigo} {loja.nome}
              <Link href={`/categoria/${slug}${ordem ? `?ordem=${ordem}` : ""}`}>ver de todas as lojas</Link>
            </p>
          )}
          <p className="cat-intro">{seo.intro}</p>
        </div>
        {todas.length > 1 && (
          <Suspense fallback={null}>
            <OrdenarOfertas />
          </Suspense>
        )}
      </div>

      <ListaOfertas
        ofertas={ofertas}
        vazio="Nenhuma oferta nesta categoria agora. Novas ofertas aparecem assim que forem encontradas."
      />

      {totalPaginas > 1 && (
        <nav className="cat-paginas" aria-label="Páginas">
          {pagina > 1 && <Link href={linkPagina(pagina - 1)}>← Anterior</Link>}
          {Array.from({ length: totalPaginas }, (_, i) => i + 1)
            .filter((n) => n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 2)
            .map((n, i, lista) => (
              <span key={n} style={{ display: "contents" }}>
                {i > 0 && n - lista[i - 1] > 1 && <span aria-hidden="true">…</span>}
                {n === pagina ? (
                  <span aria-current="page">{n}</span>
                ) : (
                  <Link href={linkPagina(n)}>{n}</Link>
                )}
              </span>
            ))}
          {pagina < totalPaginas && <Link href={linkPagina(pagina + 1)}>Próxima →</Link>}
        </nav>
      )}
    </>
  );
}
