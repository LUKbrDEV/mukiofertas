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
import AcoesOferta from "../../../components/AcoesOferta";
import ContagemRelampago from "../../../components/ContagemRelampago";
import SeloSuperDesconto from "../../../components/SeloSuperDesconto";
import { ehRelampago } from "../../../lib/relampago.mjs";
import VotosOferta from "../../../components/VotosOferta";
import GraficoPreco from "../../../components/GraficoPreco";
import { buscarHistorico, resumirHistorico } from "../../../lib/historico";
import AnaliseOferta from "../../../components/AnaliseOferta";
import { guiaDaCategoria } from "../../../data/guias";
import { deveIndexarOferta } from "../../../lib/indexacao";

export const revalidate = 60;

// Visual do card do produto (complementa o app/cartoes.css)
const CSS_PRODUTO = `
  .produto { gap: 28px; padding: 24px; border-radius: 16px; box-shadow: 0 6px 24px rgba(15, 23, 42, .06); }
  .produto-info { gap: 0; align-items: stretch; min-width: 0; }
  .pd-topo { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .pd-topo .cartao-meta { flex-wrap: wrap; gap: 8px; }
  .pd-loja { display: inline-flex; align-items: center; height: 26px; padding: 0 10px; border-radius: 999px;
             background: #0f172a; color: #fff; font-size: 0.8rem; font-weight: 800; }
  .pd-categoria { font-size: 0.82rem; font-weight: 600; color: #64748b; text-decoration: none; }
  .pd-categoria:hover { color: #0a4bb8; text-decoration: underline; }
  .produto .produto-titulo { margin: 12px 0 6px; }
  .pd-quem { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 0 0 16px; font-size: 0.85rem; color: #64748b; }
  .pd-quem a { color: #0a4bb8; font-weight: 700; text-decoration: none; }
  .pd-preco { padding: 16px 18px; border-radius: 14px; background: linear-gradient(135deg, #f0fdf4, #f8fafc 70%);
              border: 1px solid #dcfce7; }
  .pd-preco-linha { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .produto .pd-preco .preco-atual { font-size: 2.3rem; line-height: 1.1; }
  .pd-desconto { display: inline-flex; align-items: center; height: 30px; padding: 0 10px; border-radius: 8px;
                 background: #16a34a; color: #fff; font-weight: 900; font-size: 1rem; }
  .pd-de { margin: 6px 0 0; font-size: 0.92rem; color: #64748b; }
  .pd-de strong { color: #15803d; }
  .pd-selo { display: inline-flex; margin: 10px 0 0; padding: 4px 10px; border-radius: 999px; background: #dcfce7;
             color: #166534; font-weight: 800; font-size: 0.82rem; }
  .pd-cupom { max-width: 360px; margin-top: 12px; }
  .produto .produto-botao { display: flex; justify-content: center; width: 100%; max-width: 440px; margin-top: 16px;
                            padding: 16px 26px; font-size: 1.08rem; border-radius: 12px; }
  .pd-garantias { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 12px 0 0; padding: 0; list-style: none;
                  font-size: 0.84rem; color: #475569; }
  .pd-rodape { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
               margin-top: 18px; padding-top: 14px; border-top: 1px solid #f1f5f9; }
  .pd-rodape > div:first-child { margin-top: 0 !important; justify-content: flex-start !important; }
  .produto--expirado .pd-preco { background: #f8fafc; border-color: #e2e8f0; }
  .produto--expirado .pd-desconto { background: #94a3b8; }
  @media (max-width: 719px) {
    .produto { padding: 16px; gap: 18px; }
    .produto .pd-preco .preco-atual { font-size: 1.9rem; }
    .produto .produto-botao { max-width: none; }
  }
`;

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

      <style dangerouslySetInnerHTML={{ __html: CSS_PRODUTO }} />
      <article className={expirada ? "produto produto--expirado" : "produto"}>
        <div className="produto-img">
          {oferta.imagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={oferta.imagem} alt={oferta.titulo} />
          ) : (
            <span className="oferta-inicial">{oferta.loja.charAt(0).toUpperCase()}</span>
          )}
          {expirada && <span className="tag-expirado">Expirado</span>}
        </div>

        <div className="produto-info">
          <div className="pd-topo">
            <div className="cartao-meta">
              <span className="pd-loja">{oferta.loja}</span>
              {ehRelampago(oferta) && !expirada && (
                <span className="selo-relampago">
                  <IconeRaio tamanho={12} /> Relâmpago
                </span>
              )}
              {oferta.super_desconto && !expirada && <SeloSuperDesconto grande />}
              {categoria && (
                <Link href={`/categoria/${categoria.slug}`} className="pd-categoria">
                  {categoria.nome}
                </Link>
              )}
            </div>
            <AcoesOferta ofertaId={oferta.id} titulo={oferta.titulo} termoAlerta={termoDoAlerta(oferta.titulo)} expirada={expirada} />
          </div>

          <h1 className="produto-titulo">{oferta.titulo}</h1>

          <p className="pd-quem">
            <span>🕒 Postada {tempoAtras(oferta.publicada_em || oferta.atualizado_em)}</span>
            {oferta.autor && (
              <span>
                por <Link href={`/membro/${encodeURIComponent(oferta.autor)}`}>{oferta.autor}</Link>
              </span>
            )}
            {(oferta.cliques ?? 0) >= 5 && <span>👀 {oferta.cliques} pessoas foram ver</span>}
          </p>

          <div className="pd-preco">
            <div className="pd-preco-linha">
              <span className="preco-atual">{formatarPreco(oferta.preco_atual)}</span>
              {desconto > 0 && <span className="pd-desconto">-{desconto}%</span>}
            </div>
            {desconto > 0 && (
              <p className="pd-de">
                de <s>{formatarPreco(oferta.preco_antigo)}</s>
                {economia > 0 && !expirada && <strong> · você economiza {formatarPreco(economia)}</strong>}
              </p>
            )}
            {Number(oferta.preco_pix) > 0 && Number(oferta.preco_pix) < Number(oferta.preco_atual) && (
              <p className="pd-pix">
                💠 <strong>{formatarPreco(oferta.preco_pix)}</strong> no PIX
              </p>
            )}
            {ehRelampago(oferta) && !expirada && <ContagemRelampago ate={oferta.relampago_ate} variante="pagina" />}
            {resumoPreco?.menorPreco30 && !expirada && <p className="pd-selo">📉 Menor preço dos últimos 30 dias</p>}
            {/* Histórico de preço compacto, dentro do card (o grande ficava enorme em telas largas) */}
            {mostrarGrafico && (
              <GraficoPreco pontos={historico} precoAtual={oferta.preco_atual} resumo={resumoPreco} compacto />
            )}
            {oferta.cupom && !expirada && (
              <div className="pd-cupom">
                <BotaoCupom codigo={oferta.cupom} />
              </div>
            )}
          </div>

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
              Ir para a oferta na {oferta.loja} →
            </a>
          )}

          {!expirada && (
            <ul className="pd-garantias">
              <li>✅ Link oficial da loja</li>
              <li>🛒 Você compra direto na {oferta.loja}</li>
              {oferta.frete_gratis && <li>🚚 Frete grátis</li>}
              {oferta.preco_conferido_em && <li>🔎 Preço conferido {tempoAtras(oferta.preco_conferido_em)}</li>}
            </ul>
          )}

          <div className="pd-rodape">
            <VotosOferta ofertaId={oferta.id} likes={oferta.likes} dislikes={oferta.dislikes} />
            {!expirada && <BotaoPrecoSubiu ofertaId={oferta.id} />}
          </div>
        </div>
      </article>

      {expirada && blocoRelacionadas}


      <AnaliseOferta oferta={oferta} guia={guia} />

      <SobreProduto oferta={oferta} />

      {!expirada && blocoRelacionadas}

      <Comentarios ofertaId={oferta.id} />
    </>
  );
}