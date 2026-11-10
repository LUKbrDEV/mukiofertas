import IconeRaio from "./IconeRaio";
import BotaoCupom from "./BotaoCupom";
import CupomRevelar from "./CupomRevelar";
import VotosOferta from "./VotosOferta";
import BotaoDesejo from "./BotaoDesejo";
import ContagemRelampago from "./ContagemRelampago";
import SeloSuperDesconto from "./SeloSuperDesconto";
import { ehRelampago } from "../lib/relampago.mjs";
import { lojaDoNome } from "../data/lojas";
import { tituloDoCupom } from "../lib/titulo-cupom.mjs";
import { comCupomDaLoja, precoComCupom } from "../lib/cupom-loja.mjs";
import { SITE } from "../lib/site";
import {
  calcularDesconto,
  nivelDoDesconto,
  formatarPreco,
  tempoAtras,
} from "../lib/ofertas";

// Visual "cv2" (inspirado nos grandes sites de ofertas): loja e tempo no topo, foto limpa,
// preço grande com a % OFF ao lado, selos (cupom, frete, economia), votos e botão grande.
// Os estilos ficam em app/cards-v2.css. No celular o card vira uma linha (foto à esquerda,
// texto à direita), um por vez, com botão de compartilhar no WhatsApp.
// previa = true: usado na prévia do painel admin (links desativados)
export default function CardOferta({ oferta: original, previa = false }) {
  // Lojas com cupom fixo (ex.: Netshoes → MUKIOFERTAS): o cupom aparece em todas as ofertas delas
  const oferta = comCupomDaLoja(original);
  const comCupom = precoComCupom(oferta);
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

  // Compartilhar no WhatsApp (aparece no celular)
  const linkDaOferta = `${SITE.url.replace(/\/+$/, "")}/oferta/${oferta.id}`;
  const textoCompartilhar = ehCupom
    ? `${oferta.titulo} — ${linkDaOferta}`
    : `${oferta.titulo} por ${formatarPreco(oferta.preco_atual)} — ${linkDaOferta}`;

  return (
    <article className={`${classes} cv2${ehCupom ? " cv2--cupom" : ""}`}>
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
        {quando && (
          <span className="cv2-quando">
            <span className="cv2-ponto">· </span>
            {tempoAtras(quando)}
          </span>
        )}
        {ehRelampago(oferta) && !expirada && <ContagemRelampago ate={oferta.relampago_ate} />}
        {!previa && !ehCupom && <BotaoDesejo ofertaId={oferta.id} />}
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
        {Number(oferta.nota) >= 4 && !ehCupom && (
          <span
            className="cv2-nota"
            title={`Nota ${String(oferta.nota).replace(".", ",")} de 5 na ${oferta.loja}`}
            style={{
              position: "absolute", right: 8, bottom: 8, zIndex: 1, display: "inline-flex", alignItems: "center", gap: 3,
              height: 20, padding: "0 7px", borderRadius: 999, background: "rgba(255,255,255,.95)",
              boxShadow: "0 1px 4px rgba(15,23,42,.18)", color: "#0f172a", fontSize: "0.7rem", fontWeight: 800,
            }}
          >
            <span style={{ color: "#f59e0b" }}>★</span> {Number(oferta.nota).toFixed(1).replace(".", ",")}
          </span>
        )}
        {oferta.super_desconto && !expirada && !ehCupom && (
          <span className="cv2-super" style={{ position: "absolute", left: 8, bottom: 8, zIndex: 1 }}>
            <SeloSuperDesconto />
          </span>
        )}
        {expirada && <span className="tag-expirado">Expirado</span>}
      </a>

      <div className="cartao-corpo">
        <h3 className="cartao-titulo" title={oferta.titulo}>
          <a {...paginaProps} {...clicavel}>
            {ehCupom ? tituloDoCupom(oferta.titulo) : oferta.titulo}
          </a>
        </h3>

        {/* Preço: o antigo pequeno em cima, o atual grande com a % ao lado */}
        <div className="cartao-precos">
          {ehCupom ? (
            <span className="preco-atual">🎟️ Cupom</span>
          ) : (
            <>
              <span className={desconto > 0 ? "preco-antigo" : "preco-antigo cv2-sem-antigo"}>
                {desconto > 0 ? formatarPreco(oferta.preco_antigo) : " "}
              </span>
              <span className="cv2-linha-preco">
                <span className="preco-atual">{formatarPreco(oferta.preco_atual)}</span>
                {desconto > 0 && (
                  <span className="cv2-off" data-nivel={nivelDoDesconto(desconto)}>
                    {desconto}% OFF
                  </span>
                )}
              </span>
              {comCupom && !expirada && (
                <span className="cv2-pix cv2-com-cupom">
                  <strong>{formatarPreco(comCupom)}</strong> com o cupom ({oferta.cupom_percentual}% OFF)
                </span>
              )}
              {Number(oferta.preco_pix) > 0 && Number(oferta.preco_pix) < Number(oferta.preco_atual) && (
                <span className="cv2-pix">ou <strong>{formatarPreco(oferta.preco_pix)}</strong> no PIX</span>
              )}
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

        {!previa && !expirada && (
          <a
            className="cv2-compartilhar"
            href={`https://wa.me/?text=${encodeURIComponent(textoCompartilhar)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Compartilhar no WhatsApp"
            title="Compartilhar no WhatsApp"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3 1 2.6 1.1 2.8.1.2 1.9 2.9 4.6 4 1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z"
              />
            </svg>
          </a>
        )}
      </div>

      {/* Pé: votos e comentários na mesma linha, botão grande embaixo */}
      <div className="cv2-pe">
        <span className="cv2-autor">
          <span className="cv2-autor-foto" aria-hidden="true">
            {(oferta.autor || "M").charAt(0).toUpperCase()}
          </span>
          {oferta.autor || "MukiOfertas"}
        </span>
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
