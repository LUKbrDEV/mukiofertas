// Página de cada guia de compra: /guias/<slug>
// Salve como app/guias/[slug]/page.js. Os textos ficam em data/guias.js.

import Link from "next/link";
import { notFound } from "next/navigation";
import { guias, guiaPorSlug, formatarDataGuia } from "../../../data/guias";
import { buscarOfertas } from "../../../lib/ofertas";
import { SITE } from "../../../lib/site";
import LinhaOfertas from "../../../components/LinhaOfertas";
import "../../../components/guias.css";

export const revalidate = 3600;

export function generateStaticParams() {
  return guias.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const guia = guiaPorSlug(slug);
  if (!guia) return { title: "Guia não encontrado | MukiOfertas", robots: { index: false } };
  return {
    title: `${guia.titulo} | MukiOfertas`,
    description: guia.descricao,
    alternates: { canonical: `/guias/${guia.slug}` },
    openGraph: {
      type: "article",
      siteName: SITE.nome,
      locale: "pt_BR",
      title: guia.titulo,
      description: guia.descricao,
      url: `/guias/${guia.slug}`,
      modifiedTime: guia.atualizadoEm,
    },
  };
}

export default async function PaginaGuia({ params }) {
  const { slug } = await params;
  const guia = guiaPorSlug(slug);
  if (!guia) notFound();

  // Ofertas no ar das categorias do guia (só quando o guia tem categorias)
  const ofertas = guia.categorias.length
    ? (await buscarOfertas({ categoria: guia.categorias, limite: 12, limiteExpiradas: 0 })).filter(
        (o) => !o.expirada
      )
    : [];

  const outros = guias.filter((g) => g.slug !== guia.slug);
  const base = SITE.url.replace(/\/+$/, "");

  const dadosEstruturados = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guia.titulo,
      description: guia.descricao,
      inLanguage: "pt-BR",
      dateModified: guia.atualizadoEm,
      datePublished: guia.publicadoEm ?? guia.atualizadoEm,
      mainEntityOfPage: `${base}/guias/${guia.slug}`,
      author: { "@type": "Organization", name: "Equipe MukiOfertas", url: `${base}/sobre` },
      publisher: {
        "@type": "Organization",
        name: SITE.nome,
        logo: { "@type": "ImageObject", url: `${base}/logo-mukiofertas.png` },
      },
    },
    ...(guia.faq?.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: guia.faq.map((q) => ({
              "@type": "Question",
              name: q.p,
              acceptedAnswer: { "@type": "Answer", text: q.r },
            })),
          },
        ]
      : []),
  ];

  return (
    <div className="guias-pagina">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados).replace(/</g, "\\u003c") }}
      />

      <div className="guia">
        <article className="guia-artigo">
          <nav className="guia-trilha" aria-label="Você está em">
            <Link href="/">Início</Link> › <Link href="/guias">Guias</Link> › {guia.tema}
          </nav>
          <span className="guia-tema">{guia.tema}</span>
          <h1>{guia.titulo}</h1>
          <p className="guia-autor">
            Por Equipe MukiOfertas · atualizado em {formatarDataGuia(guia.atualizadoEm)} · {guia.minutos} min de
            leitura
          </p>

          <p>{guia.descricao}</p>

          {guia.resumo?.length > 0 && (
            <div className="guia-resumo">
              <strong>Resumo rápido</strong>
              <ul>
                {guia.resumo.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {guia.secoes.map((s) => (
            <section key={s.titulo}>
              <h2>{s.titulo}</h2>
              {s.paragrafos.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {s.lista?.length > 0 && (
                <ul>
                  {s.lista.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {guia.faq?.length > 0 && (
            <section className="guia-faq">
              <h2>Perguntas frequentes</h2>
              {guia.faq.map((q) => (
                <div key={q.p}>
                  <h3>{q.p}</h3>
                  <p>{q.r}</p>
                </div>
              ))}
            </section>
          )}

          <p className="guia-aviso">
            O {SITE.nome} não é uma loja: as compras são feitas no site de cada loja. Podemos receber comissão
            pelas compras feitas pelos links do site, sem custo extra para você. Preços e condições mudam
            rápido, então confira sempre o valor final na loja.
          </p>
        </article>

        <aside className="guia-lateral">
          <section className="guia-caixa">
            <h2>Outros guias</h2>
            <ul>
              {outros.map((g) => (
                <li key={g.slug}>
                  <Link href={`/guias/${g.slug}`}>{g.titulo}</Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="guia-caixa">
            <h2>Sobre o MukiOfertas</h2>
            <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.55 }}>
              Reunimos ofertas das maiores lojas do Brasil e conferimos os preços de tempos em tempos.{" "}
              <Link href="/sobre">Saiba como escolhemos as ofertas</Link>.
            </p>
          </section>
        </aside>
      </div>

      {ofertas.length > 0 && (
        <section className="guia-ofertas" aria-labelledby="titulo-ofertas-guia">
          <div className="secao-cabecalho">
            <h2 id="titulo-ofertas-guia" className="secao-titulo">
              Ofertas de {guia.tema.toLowerCase()} no ar agora
            </h2>
            <Link href={guia.linkOfertas ?? `/categoria/${guia.categorias[0]}`} className="botao-ver-mais">
              Ver todas →
            </Link>
          </div>
          <LinhaOfertas ofertas={ofertas} />
        </section>
      )}
    </div>
  );
}
