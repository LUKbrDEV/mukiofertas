import IconeRaio from "./IconeRaio";
import {
  calcularDesconto,
  nivelDoDesconto,
  formatarPreco,
  tempoAtras,
} from "../lib/ofertas";

export default function CardOferta({ oferta }) {
  const desconto = calcularDesconto(oferta);
  const economia = desconto > 0 ? oferta.preco_antigo - oferta.preco_atual : 0;
  const linkProps = {
    href: oferta.link,
    target: "_blank",
    rel: "sponsored noopener noreferrer",
  };

  return (
    <article className="oferta">
      <a {...linkProps} className="oferta-img" aria-hidden="true" tabIndex={-1}>
        {oferta.imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={oferta.imagem} alt="" loading="lazy" />
        ) : (
          <span className="oferta-inicial">{oferta.loja.charAt(0).toUpperCase()}</span>
        )}
      </a>

      <div className="oferta-corpo">
        <div className="oferta-meta">
          <span className="loja">{oferta.loja}</span>
          {oferta.relampago && (
            <span className="selo-relampago">
              <IconeRaio tamanho={12} /> Relâmpago
            </span>
          )}
          <span>{tempoAtras(oferta.atualizado_em)}</span>
        </div>

        <h3 className="oferta-titulo">
          <a {...linkProps}>{oferta.titulo}</a>
        </h3>

        <div className="oferta-precos">
          <span className="preco-atual">{formatarPreco(oferta.preco_atual)}</span>
          {desconto > 0 && (
            <span className="preco-antigo">{formatarPreco(oferta.preco_antigo)}</span>
          )}
        </div>
        {economia > 0 && (
          <p className="economia">Economia de {formatarPreco(economia)}</p>
        )}
      </div>

      <div className="oferta-acao">
        {desconto > 0 && (
          <span className="desconto" data-nivel={nivelDoDesconto(desconto)}>
            -{desconto}%
          </span>
        )}
        <a {...linkProps} className="botao">
          Ver oferta
        </a>
      </div>
    </article>
  );
}