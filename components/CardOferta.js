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

// Visual "cv2" (inspirado nos grandes sites de ofertas): loja e tempo no topo, foto limpa,
// preço grande com a % OFF ao lado, selos (cupom, frete, economia), votos e botão grande.
// Os estilos ficam em app/cards-v2.css.
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

  // Logo da loja no topo do card (as lojas do data/lojas.js têm logo e cor)
  const lojaInfo = lojaDoNome(oferta.loja);
  const quando = oferta.publicada_em ?? oferta.atualizado_em;

  return (
    <article className={`${classes} cv2`}>
      {/* Topo: loja e há quanto tempo a oferta entrou (como nos grandes sites de ofertas) */}
      <div className="cv2-topo">
        {lojaInfo?.logo ? (
          <span className="cv2-loja-logo" style={{ background: lojaInfo.cor }} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lojaInfo.logo} alt="" loading="lazy" />
          </span>
        ) : (
          <span className="cv2-loja-logo cv2-loja-logo--letra" aria-hidden="true">
            {oferta.loja.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="cv2-loja">{oferta.loja}</span>
        {quando && <span className="cv2-quando">· {tempoAtras(quando)}</span>}
        {oferta.relampago && !expirada && (
          <span className="cv2-relampago" title="Promoção relâmpago">
            <IconeRaio tamanho={11} />
            <span className="cv2-relampago-txt">Relâmpago</span>
          </span>
        )}
      </div>

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
        {oferta.selo && <span className="selo-chamativo cartao-selo">{oferta.selo}</span>}
        {expirada && <span className="tag-expirado">Expirado</span>}
      </a>

      <div className="cartao-corpo">
        <h3 className="cartao-titulo" title={oferta.titulo}>
          <a {...paginaProps} {...clicavel}>
            {oferta.titulo}
          </a>
        </h3>

        {/* Preço: o antigo pequeno em cima, o atual grande com a % ao lado */}
        <div className="cartao-precos">
          {ehCupom ? (
            <span className="preco-atual">🎟️ Cupom</span>
          ) : (
            <>
              <span className="preco-antigo">{desconto > 0 ? formatarPreco(oferta.preco_antigo) : " "}</span>
              <span className="cv2-linha-preco">
                <span className="preco-atual">{formatarPreco(oferta.preco_atual)}</span>
                {desconto > 0 && (
                  <span className="cv2-off" data-nivel={nivelDoDesconto(desconto)}>
                    {desconto}% OFF
                  </span>
                )}
              </span>
            </>
          )}
        </div>

        {/* Espaço fixo para os selos e o cupom: todos os cards ficam com a mesma altura */}
        {/* Cupom (aba Cupons): código escondido pela fita; ao clicar, copia e revela */}
        {cupomComFita ? (
          <div style={{ margin: "6px 0 2px" }}>
            <CupomRevelar codigo={oferta.cupom} />
          </div>
        ) : cupomDeResgatar ? (
          // mesmo visual da fita dos outros cupons, mas leva direto para a página do cupom na loja
          <div style={{ margin: "6px 0 2px" }}>
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
          <div className="cv2-selos">
            {mostrarCupom && !previa && <BotaoCupom codigo={oferta.cupom} compacto />}
            {mostrarCupom && previa && <span className="cupom">Cupom {oferta.cupom}</span>}
            {!mostrarCupom && oferta.frete_gratis && !expirada && <span className="cv2-selo cv2-selo--frete">🚚 Frete grátis</span>}
            {!mostrarCupom && !oferta.frete_gratis && mostrarEconomia && (
              <span className="cv2-selo cv2-selo--economia">Economize {formatarPreco(economia)}</span>
            )}
          </div>
        )}
      </div>

      {/* Pé: votos e comentários na mesma linha, botão grande embaixo */}
      <div className="cv2-pe">
        <VotosOferta ofertaId={oferta.id} likes={oferta.likes} dislikes={oferta.dislikes} previa={previa} />
        {!ehCupom && (
          <a {...paginaProps} className="cartao-comentarios cv2-comentarios" aria-label="Ver comentários">
            💬
          </a>
        )}
      </div>

      {/* Cupom (com código ou de resgatar): sem botão (foto e título também levam para a loja) */}
      {!cupomComFita && !cupomDeResgatar && (
        <a {...lojaProps} {...clicavel} className="botao cartao-botao">
          {expirada ? "Ver comentários" : ehCupom ? "Pegar cupom" : "Pegar promoção"}
        </a>
      )}
    </article>
  );
}
