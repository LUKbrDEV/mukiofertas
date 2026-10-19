import IconeRaio from "./IconeRaio";
import { calcularDesconto, nivelDoDesconto, formatarPreco } from "../lib/ofertas";

export default function FaixaRelampago({ ofertas }) {
  if (ofertas.length === 0) return null;

  return (
    <section className="faixa" aria-labelledby="titulo-faixa">
      <h2 id="titulo-faixa" className="faixa-titulo">
        <IconeRaio tamanho={20} /> Promoções relâmpago
      </h2>
      <div className="faixa-lista">
        {ofertas.map((oferta) => {
          const desconto = calcularDesconto(oferta);
          return (
            <a
              key={oferta.id}
              href={`/ir/${oferta.id}`}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="mini"
            >
              <div className="mini-img">
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
              </div>
              <span className="mini-titulo">{oferta.titulo}</span>
              <span className="preco-atual">{formatarPreco(oferta.preco_atual)}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
