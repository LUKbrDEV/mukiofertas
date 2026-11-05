import Link from "next/link";
import { notFound } from "next/navigation";
import Comentarios from "../../../components/Comentarios";
import IconeRaio from "../../../components/IconeRaio";
import BotaoPrecoSubiu from "../../../components/BotaoPrecoSubiu";
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
import GraficoPreco from "../../../components/GraficoPreco";
import { buscarHistorico, resumirHistorico } from "../../../lib/historico";
import AnaliseOferta from "../../../components/AnaliseOferta";
import { guiaDaCategoria } from "../../../data/guias";
import { deveIndexarOferta } from "../../../lib/indexacao";

export const revalidate = 60;

// Sugestão de alerta a partir do título: as 3 primeiras palavras que dizem o que é o produto
// ("Air Fryer Mondial 4L Preta..." → "air fryer mondial")
const PALAVRAS_FRACAS = new Set(["de", "da", "do", "das", "dos", "com", "para", "e", "a", "o", "em", "kit", "novo", "nova", "oferta"]);
function termoDoAlerta(titulo) {
  return String(titulo)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((p) => p.length > 1 && !PALAVRAS_FRACAS.has(p))
    .slice(0, 3)
    .join(" ");
}

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
    // Oferta expirada ou sem detalhes próprios continua acessível, mas fica fora do Google
    // (evita páginas com preço vencido e páginas quase iguais). Regra em lib/indexacao.js.
    robots: deveIndexarOferta(oferta, oferta.expirada) ? undefined : { index: false, follow: true },
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

  const historico = await buscarHistorico(oferta.id);
  const resumoPreco = resumirHistorico(historico, oferta.preco_atual);
  const mostrarGrafico = resumoPreco && (historico.length >= 2 || resumoPreco.diasDeHistorico >= 1);

  const desconto = calcularDesconto(oferta);
  const economia = desconto > 0 ? oferta.preco_antigo - oferta.preco_atual : 0;
  const expirada = oferta.expirada;

  const categoria = categorias.find((c) => c.slug === oferta.categoria) ?? null;
  const pai = paiDe(categorias, categoria);
  const guia = guiaDaCategoria(categoria?.slug, pai?.slug);

  // Até quando o preço vale (o que vier primeiro: expires_at ou a data de publicação + prazo do site)
  const prazos = [];
  if (oferta.expires_at) prazos.push(new Date(oferta.expires_at).getTime());
  if (oferta.publicada_em) prazos.push(new Date(oferta.publicada_em).getTime() + DIAS_NO_SITE * 86400000);
  const validoAte = prazos.length ? new Date(Math.min(...prazos)).toISOString().slice(0, 10) : undefined;

  // Mais ofertas da mesma categoria (links internos ajudam o Google a encontrar as outras páginas)
  // Sem categoria: usa as ofertas da mesma loja. Oferta expirada mostra essas ofertas logo abaixo,
  // para quem chegou por um link antigo (WhatsApp, Telegram, Google) achar algo que está no ar.
  const relacionadas = (
    await buscarOfertas(
      categoria
        ? { categoria: categoria.slug, limite: 13, limiteExpiradas: 0 }
        : { loja: oferta.loja, limite: 13, limiteExpiradas: 0 }
    )
  )
    .filter((o) => o.id !== oferta.id)
    .slice(0, 12);
  const tituloRelacionadas = expirada
    ? "Esta oferta acabou, mas estas estão no ar"
    : categoria
      ? `Mais ofertas de ${categoria.nome}`
      : `Mais ofertas da ${oferta.loja}`;
  const linkRelacionadas = categoria ? `/categoria/${categoria.slug}` : "/";

  const blocoRelacionadas =
    relacionadas.length > 0 ? (
      <section
        id="ofertas-parecidas"
        className="secao"
        style={{ marginTop: expirada ? 16 : 28 }}
        aria-labelledby="titulo-relacionadas"
      >
        <div className="secao-cabecalho">
          <h2 id="titulo-relacionadas" className="titulo-secao">
            {tituloRelacionadas}
          </h2>
          <Link href={linkRelacionadas} className="botao-ver-mais">
            Ver todas
          </Link>
        </div>
        <LinhaOfertas ofertas={relacionadas} />
      </section>
    ) : null;

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
          {resumoPreco?.menorPreco30 && !expirada && (
            <p
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, margin: "6px 0 2px", padding: "4px 10px",
                borderRadius: 999, background: "#dcfce7", color: "#166534", fontWeight: 800, fontSize: 13,
              }}
            >
              📉 Menor preço dos últimos 30 dias
            </p>
          )}
          {economia > 0 && !expirada && (
            <p className="economia">Economia de {formatarPreco(economia)}</p>
          )}

          {oferta.cupom && !expirada && (
            <div style={{ maxWidth: 360, margin: "8px 0 4px" }}>
              <BotaoCupom codigo={oferta.cupom} />
            </div>
          )}

          {expirada ? (
            <>
              <p className="produto-aviso">
                Esta oferta terminou e o preço pode ter mudado. Ainda dá para ver o que a
                comunidade comentou.
              </p>
              {relacionadas.length > 0 && (
                <a href="#ofertas-parecidas" className="botao produto-botao">
                  Ver ofertas parecidas no ar
                </a>
              )}
            </>
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
          {!expirada && <BotaoPrecoSubiu ofertaId={oferta.id} />}
          <Link
            href={`/alertas?termo=${encodeURIComponent(termoDoAlerta(oferta.titulo))}`}
            style={{ display: "inline-block", marginTop: 10, color: "#0a4bb8", fontWeight: 700, textDecoration: "none" }}
          >
            🔔 {expirada ? "Me avise quando voltar" : "Criar alerta para ofertas parecidas"}
          </Link>

          <p className="cartao-rodape">
            <span>{tempoAtras(oferta.atualizado_em)}</span>
            {oferta.autor && (
              <span className="cartao-autor">
                por <Link href={`/membro/${encodeURIComponent(oferta.autor)}`}>{oferta.autor}</Link>
              </span>
            )}
          </p>
        </div>
      </article>

      {expirada && blocoRelacionadas}

      {mostrarGrafico && (
        <GraficoPreco pontos={historico} precoAtual={oferta.preco_atual} resumo={resumoPreco} />
      )}

      <AnaliseOferta oferta={oferta} guia={guia} />

      <SobreProduto oferta={oferta} />

      {!expirada && blocoRelacionadas}

      <Comentarios ofertaId={oferta.id} />
    </>
  );
}