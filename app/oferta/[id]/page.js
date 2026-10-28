import Link from "next/link";
import { notFound } from "next/navigation";
import Comentarios from "../../../components/Comentarios";
import IconeRaio from "../../../components/IconeRaio";
import { SITE } from "../../../lib/site";
import {
  buscarOfertaPorId,
  buscarOfertas,
  calcularDesconto,
  nivelDoDesconto,
  formatarPreco,
  tempoAtras,
  DIAS_NO_SITE,
} from "../../../lib/ofertas";
import { categorias } from "../../../data/ofertas";
import { paiDe } from "../../../lib/departamentos";
import LinhaOfertas from "../../../components/LinhaOfertas";
import SobreProduto from "../../../components/SobreProduto";
import BotaoCupom from "../../../components/BotaoCupom";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { id } = await params;
  const oferta = await buscarOfertaPorId(id);
  if (!oferta) {
    return { title: "Oferta não encontrada | MukiOfertas", robots: { index: false } };
  }

  const preco = formatarPreco(oferta.preco_atual);
  const titulo = `${oferta.titulo} por ${preco}`;
  const descricao = oferta.expirada
    ? `${oferta.titulo} na ${oferta.loja}. Oferta encerrada. Veja o que a comunidade comentou.`
    : `${oferta.titulo} por ${preco} na ${oferta.loja}. Veja os comentários da comunidade e aproveite antes que acabe.`;
  const imagem = oferta.imagem || "/logo-mukiofertas.png";

  return {
    title: `${titulo} | MukiOfertas`,
    description: descricao,
    alternates: { canonical: `/oferta/${oferta.id}` },
    // Oferta expirada continua acessível, mas sai do Google (evita páginas com preço vencido)
    robots: oferta.expirada ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      siteName: SITE.nome,
      locale: "pt_BR",
      title: titulo,
      description: descricao,
      url: `/oferta/${oferta.id}`,
      images: [{ url: imagem, alt: oferta.titulo }],
    },
    twitter: {
      card: "summary",
      title: titulo,
      description: descricao,
      images: [imagem],
    },
  };
}

export default async function PaginaOferta({ params }) {
  const { id } = await params;
  const oferta = await buscarOfertaPorId(id);
  if (!oferta) notFound();

  const desconto = calcularDesconto(oferta);
  const economia = desconto > 0 ? oferta.preco_antigo - oferta.preco_atual : 0;
  const expirada = oferta.expirada;

  const categoria = categorias.find((c) => c.slug === oferta.categoria) ?? null;
  const pai = paiDe(categorias, categoria);

  // Até quando o preço vale (o que vier primeiro: expires_at ou a data de publicação + prazo do site)
  const prazos = [];
  if (oferta.expires_at) prazos.push(new Date(oferta.expires_at).getTime());
  if (oferta.publicada_em) prazos.push(new Date(oferta.publicada_em).getTime() + DIAS_NO_SITE * 86400000);
  const validoAte = prazos.length ? new Date(Math.min(...prazos)).toISOString().slice(0, 10) : undefined;

  // Mais ofertas da mesma categoria (links internos ajudam o Google a encontrar as outras páginas)
  const relacionadas = categoria
    ? (await buscarOfertas({ categoria: categoria.slug, limite: 13, limiteExpiradas: 0 }))
        .filter((o) => o.id !== oferta.id)
        .slice(0, 12)
    : [];

  // Dados estruturados: produto com preço e o caminho da página
  const base = SITE.url.replace(/\/+$/, "");
  const trilha = [
    { nome: "Início", url: `${base}/` },
    ...(pai ? [{ nome: pai.nome, url: `${base}/categoria/${pai.slug}` }] : []),
    ...(categoria ? [{ nome: categoria.nome, url: `${base}/categoria/${categoria.slug}` }] : []),
  ];
  const dadosEstruturados = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: oferta.titulo,
      image: oferta.imagem ? [oferta.imagem] : undefined,
      description: Array.isArray(oferta.sobre) && oferta.sobre.length ? oferta.sobre.slice(0, 3).join(" ") : undefined,
      category: categoria?.nome,
      offers: {
        "@type": "Offer",
        url: `${base}/oferta/${oferta.id}`,
        priceCurrency: "BRL",
        price: Number(oferta.preco_atual).toFixed(2),
        priceValidUntil: validoAte,
        availability: expirada ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
        seller: { "@type": "Organization", name: oferta.loja },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [...trilha, { nome: oferta.titulo, url: `${base}/oferta/${oferta.id}` }].map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: t.nome,
        item: t.url,
      })),
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(dadosEstruturados).replace(/</g, "\\u003c"),
        }}
      />

      <nav className="produto-voltar" aria-label="Você está em">
        <Link href="/">Início</Link>
        {pai && (
          <>
            {" › "}
            <Link href={`/categoria/${pai.slug}`}>{pai.nome}</Link>
          </>
        )}
        {categoria && (
          <>
            {" › "}
            <Link href={`/categoria/${categoria.slug}`}>{categoria.nome}</Link>
          </>
        )}
      </nav>

      <article className={expirada ? "produto produto--expirado" : "produto"}>
        <div className="produto-img">
          {oferta.imagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={oferta.imagem} alt={oferta.titulo} />
          ) : (
            <span className="oferta-inicial">{oferta.loja.charAt(0).toUpperCase()}</span>
          )}
          {desconto > 0 && (
            <span className="desconto" data-nivel={nivelDoDesconto(desconto)}>
              -{desconto}%
            </span>
          )}
          {expirada && <span className="tag-expirado">Expirado</span>}
        </div>

        <div className="produto-info">
          <div className="cartao-meta">
            <span className="loja">{oferta.loja}</span>
            {oferta.relampago && !expirada && (
              <span className="selo-relampago">
                <IconeRaio tamanho={12} /> Relâmpago
              </span>
            )}
          </div>

          <h1 className="produto-titulo">{oferta.titulo}</h1>

          <div className="cartao-precos">
            <span className="preco-atual">{formatarPreco(oferta.preco_atual)}</span>
            {desconto > 0 && (
              <span className="preco-antigo">{formatarPreco(oferta.preco_antigo)}</span>
            )}
          </div>
          {economia > 0 && !expirada && (
            <p className="economia">Economia de {formatarPreco(economia)}</p>
          )}

          {oferta.cupom && !expirada && (
            <div style={{ maxWidth: 360, margin: "8px 0 4px" }}>
              <BotaoCupom codigo={oferta.cupom} />
            </div>
          )}

          {expirada ? (
            <p className="produto-aviso">
              Esta oferta terminou e o preço pode ter mudado. Ainda dá para ver o que a
              comunidade comentou.
            </p>
          ) : (
            <a
              href={`/ir/${oferta.id}`}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="botao produto-botao"
            >
              Ir para a oferta na {oferta.loja}
            </a>
          )}

          <p className="cartao-rodape">
            <span>{tempoAtras(oferta.atualizado_em)}</span>
            {oferta.autor && <span className="cartao-autor">por {oferta.autor}</span>}
          </p>
        </div>
      </article>

      <SobreProduto oferta={oferta} />

      {relacionadas.length > 0 && (
        <section className="secao" style={{ marginTop: 28 }} aria-labelledby="titulo-relacionadas">
          <div className="secao-cabecalho">
            <h2 id="titulo-relacionadas" className="titulo-secao">
              Mais ofertas de {categoria.nome}
            </h2>
            <Link href={`/categoria/${categoria.slug}`} className="botao-ver-mais">
              Ver todas
            </Link>
          </div>
          <LinhaOfertas ofertas={relacionadas} />
        </section>
      )}

      <Comentarios ofertaId={oferta.id} />
    </>
  );
}