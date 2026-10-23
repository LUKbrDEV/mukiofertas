import IconeRaio from "./IconeRaio";
import {
  calcularDesconto,
  nivelDoDesconto,
  formatarPreco,
  tempoAtras,
} from "../lib/ofertas";

// previa = true: usado na prévia do painel admin (links desativados)
export default function CardOferta({ oferta, previa = false }) {
  const desconto = calcularDesconto(oferta);
  const economia = desconto > 0 ? oferta.preco_antigo - oferta.preco_atual : 0;
  const linkProps = previa
    ? { href: "#" }
    : {
        href: `/ir/${oferta.id}`,
        target: "_blank",
        rel: "sponsored noopener noreferrer",
      };

  return (
    <article className={oferta.destaque ? "cartao cartao--destaque" : "cartao"}>
      <a {...linkProps} className="cartao-img" aria-hidden="true" tabIndex={-1}>
        {oferta.imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={oferta.imagem} alt="" loading="lazy" />
        ) : (
          <span className="oferta-inicial">{oferta.loja.charAt(0).toUpperCase()}</span>
        )}
        {desconto > 0 && (
          <span className="desconto" data-nivel={nivelDoDesconto(desconto)}>
            -{desconto}%
          </span>
        )}
        {oferta.selo && <span className="selo-chamativo cartao-selo">{oferta.selo}</span>}
      </a>

      <div className="cartao-corpo">
        <div className="cartao-meta">
          <span className="loja">{oferta.loja}</span>
          {oferta.relampago && (
            <span className="selo-relampago">
              <IconeRaio tamanho={12} /> Relâmpago
            </span>
          )}
        </div>

        <h3 className="cartao-titulo">
          <a {...linkProps}>{oferta.titulo}</a>
        </h3>

        <div className="cartao-precos">
          <span className="preco-atual">{formatarPreco(oferta.preco_atual)}</span>
          {desconto > 0 && (
            <span className="preco-antigo">{formatarPreco(oferta.preco_antigo)}</span>
          )}
        </div>
        {economia > 0 && <p className="economia">Economia de {formatarPreco(economia)}</p>}
        {oferta.cupom && (
          <p className="cupom">
            Cupom <strong>{oferta.cupom}</strong>
          </p>
        )}

        <p className="cartao-rodape">
          <span>{tempoAtras(oferta.atualizado_em)}</span>
          {oferta.autor && <span className="cartao-autor">por {oferta.autor}</span>}
        </p>
      </div>

      <a {...linkProps} className="botao cartao-botao">
        Ver oferta
      </a>
    </article>
  );
}
