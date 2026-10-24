import Link from "next/link";
import { notFound } from "next/navigation";
import Comentarios from "../../../components/Comentarios";
import IconeRaio from "../../../components/IconeRaio";
import {
  buscarOfertaPorId,
  calcularDesconto,
  nivelDoDesconto,
  formatarPreco,
  tempoAtras,
} from "../../../lib/ofertas";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { id } = await params;
  const oferta = await buscarOfertaPorId(id);
  if (!oferta) return { title: "Oferta não encontrada | MukiOfertas" };
  return {
    title: `${oferta.titulo} | MukiOfertas`,
    description: `${oferta.titulo} por ${formatarPreco(oferta.preco_atual)} na ${oferta.loja}. Veja os comentários da comunidade.`,
  };
}

export default async function PaginaOferta({ params }) {
  const { id } = await params;
  const oferta = await buscarOfertaPorId(id);
  if (!oferta) notFound();

  const desconto = calcularDesconto(oferta);
  const economia = desconto > 0 ? oferta.preco_antigo - oferta.preco_atual : 0;
  const expirada = oferta.expirada;

  return (
    <>
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

      <Comentarios ofertaId={oferta.id} />
    </>
  );
}