import IconeRaio from "./IconeRaio";
import BotaoCupom from "./BotaoCupom";
import CupomRevelar from "./CupomRevelar";
import VotosOferta from "./VotosOferta";
import { lojaDoNome } from "../data/lojas";
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

  // Cupom (aba Cupons): não tem página de produto, então foto, título e botão vão direto para a loja
  const ehCupom = oferta.categoria === "cupons";
  // Loja cadastrada no data/lojas.js com logo: usada quando a oferta não tem foto
  const lojaComLogo = (() => {
    const l = lojaDoNome(oferta.loja);
    return l?.logo ? l : null;
  })();

  // Botão: vai para a loja (link de afiliado). Em oferta expirada, vai para a página do produto
  const paginaDoProduto = previa ? { href: "#" } : { href: `/oferta/${oferta.id}` };
  const lojaProps =
    previa || expirada
      ? paginaDoProduto
      : {
          href: `/ir/${oferta.id}`,
          target: "_blank",
          rel: "sponsored noopener noreferrer",
        };

  // Foto e título: abrem a página do produto, com os comentários (cupom: a loja)
  const paginaProps = ehCupom && !previa && !expirada ? lojaProps : paginaDoProduto;

  // O CSS antigo (globals.css) desliga o clique nos cards expirados; aqui ele volta,
  // para "Ver comentários", a foto e o título abrirem a página da oferta
  const clicavel = expirada ? { style: { pointerEvents: "auto", cursor: "pointer" } } : {};

  const classes = [
    "cartao",
    oferta.destaque && !expirada && "cartao--destaque",
    expirada && "cartao--expirado",
  ]
    .filter(Boolean)
    .join(" ");

  // Postagem que é só um cupom: sem preço, com o código em destaque
  const mostrarEconomia = economia > 0 && !expirada && !ehCupom;
  const mostrarCupom = Boolean(oferta.cupom) && !expirada;
  const cupomComFita = ehCupom && mostrarCupom && !previa;
  // Cupom sem código (de ativar na própria loja, comum na Amazon e no Mercado Livre)
  const cupomDeResgatar = ehCupom && !oferta.cupom && !expirada && !previa;

  return (
    <article className={classes}>
      <a {...paginaProps} {...clicavel} className="cartao-img" aria-hidden="true" tabIndex={-1}>
        {oferta.imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={oferta.imagem} alt="" loading="lazy" />
        ) : lojaComLogo ? (
          // Sem foto: cartão com a logo e a cor da loja (ex.: cupons da KaBuM!)
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              background: `radial-gradient(circle at 75% 20%, rgba(255,255,255,0.22), rgba(255,255,255,0) 55%), ${lojaComLogo.cor}`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lojaComLogo.logo}
              alt=""
              loading="lazy"
              style={{ width: "62%", height: "auto", maxHeight: "38%", objectFit: "contain" }}
            />
            {ehCupom && (
              <span
                style={{
                  padding: "3px 12px",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  color: lojaComLogo.cor,
                  background: "#fff",
                  borderRadius: 999,
                }}
              >
                CUPOM
              </span>
            )}
          </span>
        ) : (
          <span className="oferta-inicial">{oferta.loja.charAt(0).toUpperCase()}</span>
        )}
        {desconto > 0 && !ehCupom && (
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
          <a {...paginaProps} {...clicavel}>
            {oferta.titulo}
          </a>
        </h3>

        <div className="cartao-precos">
          {ehCupom ? (
            <span className="preco-atual">🎟️ Cupom</span>
          ) : (
            <>
              <span className="preco-atual">{formatarPreco(oferta.preco_atual)}</span>
              {desconto > 0 && (
                <span className="preco-antigo">{formatarPreco(oferta.preco_antigo)}</span>
              )}
            </>
          )}
        </div>

        {/* Espaço fixo para economia e cupom: todos os cards ficam com a mesma altura */}
        {/* Cupom (aba Cupons): código escondido pela fita; ao clicar, copia e revela */}
        {cupomComFita ? (
          <div style={{ margin: "8px 0 6px" }}>
            <CupomRevelar codigo={oferta.cupom} />
          </div>
        ) : cupomDeResgatar ? (
          // mesmo visual da fita dos outros cupons, mas leva direto para a página do cupom na loja
          <div style={{ margin: "8px 0 6px" }}>
            <a
              {...lojaProps}
              aria-label={`Resgatar o cupom na ${oferta.loja}`}
              style={{
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                width: "100%",
                height: 44,
                border: "2px dashed #ff7a1a",
                borderRadius: 10,
                color: "#fff",
                fontSize: 13,
                fontWeight: 800,
                textDecoration: "none",
                background:
                  "repeating-linear-gradient(-45deg, rgba(255,255,255,0.16) 0 8px, rgba(255,255,255,0) 8px 16px), linear-gradient(180deg, #ff8a2a, #f05a00)",
                boxShadow: "inset 0 0 0 2px #fff7ed",
              }}
            >
              🎁 Resgatar na loja →
            </a>
          </div>
        ) : (
        <div className="cartao-extras">
          <p className="economia">
            {mostrarEconomia ? `Economia de ${formatarPreco(economia)}` : " "}
          </p>
          <div className="cartao-cupom-espaco">
            {mostrarCupom && !previa && <BotaoCupom codigo={oferta.cupom} compacto />}
            {mostrarCupom && previa && <span className="cupom">Cupom {oferta.cupom}</span>}
          </div>
        </div>
        )}

        <p className="cartao-rodape">
          <span>{tempoAtras(oferta.atualizado_em)}</span>
          {oferta.autor && <span className="cartao-autor">por {oferta.autor}</span>}
          {!ehCupom && (
            <a {...paginaProps} className="cartao-comentarios">
              💬 Comentários
            </a>
          )}
        </p>
      </div>

      {/* Cupom (com código ou de resgatar): sem botão (foto e título também levam para a loja) */}
      {!cupomComFita && !cupomDeResgatar && (
        <a {...lojaProps} {...clicavel} className="botao cartao-botao">
          {expirada ? "Ver comentários" : ehCupom ? "Pegar cupom" : "Ver oferta"}
        </a>
      )}

      {/* Like / Deslike com os números (votos.sql) */}
      <VotosOferta ofertaId={oferta.id} likes={oferta.likes} dislikes={oferta.dislikes} previa={previa} />
    </article>
  );
}
