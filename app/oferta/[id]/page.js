import Link from "next/link";
import { notFound } from "next/navigation";
import Comentarios from "../../../components/Comentarios";
import IconeRaio from "../../../components/IconeRaio";
import { SITE } from "../../../lib/site";
import {
  buscarOfertaPorId,
  calcularDesconto,
  nivelDoDesconto,
  formatarPreco,
  tempoAtras,
} from "../../../lib/ofertas";
import SobreProduto from "../../../components/SobreProduto";

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

  // Dados estruturados para o Google entender que a página é de um produto com preço
  const dadosEstruturados = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: oferta.titulo,
    image: oferta.imagem ? [oferta.imagem] : undefined,
    offers: {
      "@type": "Offer",
      url: `${SITE.url}/oferta/${oferta.id}`,
      priceCurrency: "BRL",
      price: Number(oferta.preco_atual).toFixed(2),
      availability: expirada ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      seller: { "@type": "Organization", name: oferta.loja },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(dadosEstruturados).replace(/</g, "\\u003c"),
        }}
      />

      <p className="produto-voltar">
        <Link href="/">← Voltar para as ofertas</Link>
      </p>

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
            <p className="cupom">
              Cupom <strong>{oferta.cupom}</strong>
            </p>
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

      <Comentarios ofertaId={oferta.id} />
    </>
  );
}