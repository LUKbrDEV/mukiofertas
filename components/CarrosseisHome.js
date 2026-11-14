// Os 5 carrosséis do topo da página inicial (antes das abas Destaques, Recentes...).
// Salve como components/CarrosseisHome.js. Usado pelo app/page.js.
// As ofertas de cada carrossel vêm do lib/feed-home.js (carrosseisDaHome).
// Mesmo esquema dos carrosséis antigos: components/Carrossel.js (setas laranja redondas e passagem
// automática, que para quando o mouse está em cima) com o card do site todo (CardOferta).
// Computador: 4 cards visíveis, do mesmo tamanho da grade das abas. Celular: 1 card (arrasta para o lado).

import Carrossel from "./Carrossel";
import CardOferta from "./CardOferta";

const PASSA_A_CADA = 5000; // ms para passar sozinho de um card para o outro

const CSS = `
  .hc { margin: 0 0 8px; }
  .hc-secao { margin: 0 0 26px; }
  .hc-cabecalho { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin: 0 0 10px; }
  .hc-textos { min-width: 0; }
  .hc-titulo {
    display: flex; align-items: center; gap: 8px; margin: 0;
    font-family: var(--fonte-titulo), system-ui, sans-serif; font-size: 1.3rem; font-weight: 800; color: #0f172a;
  }
  .hc-descricao { margin: 2px 0 0; font-size: 0.86rem; color: #475569; }
  .hc-ver { text-decoration: none; font-size: 0.86rem; padding: 7px 16px; }

  /* Computador: 5 cards visíveis por carrossel (espaço de 12px), com o card mais compacto */
  .hc .carrossel-trilho { gap: 12px; padding: 4px 2px 10px; }
  .hc .carrossel-item { width: calc((100% - 48px) / 5); }
  .hc .carrossel-item > .cf { width: 100%; height: 100%; }
  @media (min-width: 640px) {
    .hc .cf { border-radius: 14px; }
    .hc .cf-foto-link { padding: 22px 12px 20px; }
    .hc .cf-selo-topo { left: 8px; top: 8px; height: 20px; padding: 0 7px; font-size: 0.66rem; }
    .hc .cf-off { left: 8px; bottom: 8px; padding: 2px 6px; font-size: 0.72rem; }
    .hc .cf-coracao, .hc .cf-coracao .bd--card { width: 26px; height: 26px; }
    .hc .cf-corpo { gap: 4px; padding: 9px; }
    .hc .cf-loja { gap: 6px; }
    .hc .cf-sigla { width: 22px; height: 22px; font-size: 0.6rem; }
    .hc .cf-sigla--logo { width: 24px; height: 24px; padding: 3px; }
    .hc .cf-loja-nome { font-size: 0.74rem; }
    .hc .cf-quando { font-size: 0.66rem; }
    .hc .cf-titulo { font-size: 0.8rem; line-height: 1.25; }
    .hc .cf-titulo a { min-height: 2.5em; }
    .hc .cf-selos { min-height: 0; gap: 4px; }
    .hc .cf-selos:empty { display: none; }
    .hc .cf-cupom, .hc .cf-selo { height: 22px; padding: 0 7px; font-size: 0.68rem; }
    .hc .cf-de { font-size: 0.7rem; }
    .hc .cf-por { font-size: 1.08rem; }
    .hc .cf-pix { font-size: 0.66rem; }
    .hc .cf-botao { height: 32px; margin-top: 2px; border-radius: 8px; font-size: 0.76rem; }
    .hc .cf-pe { min-height: 36px; gap: 6px; padding: 0 8px; font-size: 0.7rem; }
    .hc .cf-zap, .hc .cf-pe .bd--card { width: 26px; height: 26px; }
    .hc .up { height: 26px; padding: 0 8px 0 6px; font-size: 0.72rem; }
  }
  @media (max-width: 1099px) { .hc .carrossel-item { width: calc((100% - 36px) / 4); } }
  @media (max-width: 899px) { .hc .carrossel-item { width: calc((100% - 24px) / 3); } }
  @media (max-width: 639px) {
    .hc-secao { margin-bottom: 18px; }
    .hc-titulo { font-size: 1.05rem; }
    .hc-descricao { display: none; }
    .hc-cabecalho { align-items: center; margin-bottom: 6px; }
    .hc-ver { padding: 5px 12px; font-size: 0.8rem; }
    .hc .carrossel-trilho { gap: 10px; scroll-snap-type: x mandatory; }
    .hc .carrossel-item { width: 90%; }
  }
`;

export default function CarrosseisHome({ carrosseis = [] }) {
  if (!carrosseis.length) return null;

  return (
    <div className="hc">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {carrosseis.map((c, i) => (
        <section key={c.id} className="hc-secao" aria-labelledby={`hc-titulo-${c.id}`}>
          <div className="hc-cabecalho">
            <div className="hc-textos">
              <h2 id={`hc-titulo-${c.id}`} className="hc-titulo">
                <span aria-hidden="true">{c.emoji}</span> {c.titulo}
              </h2>
              {c.descricao && <p className="hc-descricao">{c.descricao}</p>}
            </div>
            {c.href && (
              <a className="botao-ver-mais hc-ver" href={c.href}>
                Ver mais
              </a>
            )}
          </div>
          {/* cada carrossel passa num ritmo um pouco diferente, para não andarem todos juntos */}
          <Carrossel auto={PASSA_A_CADA + i * 600}>
            {c.ofertas.map((o) => (
              <div key={o.id} className="carrossel-item">
                <CardOferta oferta={o} />
              </div>
            ))}
          </Carrossel>
        </section>
      ))}
    </div>
  );
}
