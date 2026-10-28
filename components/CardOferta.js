import IconeRaio from "./IconeRaio";
import BotaoCupom from "./BotaoCupom";
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
  const expirada = Boolean(oferta.expirada);

  // Foto e título: abrem a página do produto, com os comentários
  const paginaProps = previa ? { href: "#" } : { href: `/oferta/${oferta.id}` };

  // Botão: vai para a loja (link de afiliado). Em oferta expirada, vai para a página do produto
  const lojaProps =
    previa || expirada
      ? paginaProps
      : {
          href: `/ir/${oferta.id}`,
          target: "_blank",
          rel: "sponsored noopener noreferrer",
        };

  const classes = [
    "cartao",
    oferta.destaque && !expirada && "cartao--destaque",
    expirada && "cartao--expirado",
  ]
    .filter(Boolean)
    .join(" ");

  const mostrarEconomia = economia > 0 && !expirada;
  const mostrarCupom = Boolean(oferta.cupom) && !expirada;

  return (
    <article className={classes}>
      <a {...paginaProps} className="cartao-img" aria-hidden="true" tabIndex={-1}>
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
        {expirada && <span className="tag-expirado">Expirado</span>}
      </a>

      <div className="cartao-corpo">
        <div className="cartao-meta">
          <span className="loja">{oferta.loja}</span>
          {oferta.relampago && !expirada && (
            <span className="selo-relampago">
              <IconeRaio tamanho={12} /> Relâmpago
            </span>
          )}
        </div>

        <h3 className="cartao-titulo" title={oferta.titulo}>
          <a {...paginaProps}>{oferta.titulo}</a>
        </h3>

        <div className="cartao-precos">
          <span className="preco-atual">{formatarPreco(oferta.preco_atual)}</span>
          {desconto > 0 && (
            <span className="preco-antigo">{formatarPreco(oferta.preco_antigo)}</span>
          )}
        </div>

        {/* Espaço fixo para economia e cupom: todos os cards ficam com a mesma altura */}
        <div className="cartao-extras">
          <p className="economia">
            {mostrarEconomia ? `Economia de ${formatarPreco(economia)}` : " "}
          </p>
          <div className="cartao-cupom-espaco">
            {mostrarCupom && !previa && <BotaoCupom codigo={oferta.cupom} compacto />}
            {mostrarCupom && previa && <span className="cupom">Cupom {oferta.cupom}</span>}
          </div>
        </div>

        <p className="cartao-rodape">
          <span>{tempoAtras(oferta.atualizado_em)}</span>
          {oferta.autor && <span className="cartao-autor">por {oferta.autor}</span>}
          <a {...paginaProps} className="cartao-comentarios">
            💬 Comentários
          </a>
        </p>
      </div>

      <a {...lojaProps} className="botao cartao-botao">
        {expirada ? "Ver comentários" : "Ver oferta"}
      </a>
    </article>
  );
}