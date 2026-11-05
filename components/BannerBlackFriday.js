// Banner da Black Friday do MukiOfertas (arte própria, sem imagem de loja e sem cronômetro).
// Salve como components/BannerBlackFriday.js. Usado na página inicial (app/page.js).
//
// "As melhores ofertas da Black Friday já começaram". Depois da Cyber Monday, o banner some sozinho.

import Link from "next/link";

const ANO = 2026;
export const BF_INICIO = new Date("2026-11-27T00:00:00-03:00").getTime(); // sexta-feira, 0h (Brasília)
export const BF_FIM = new Date("2026-12-01T00:00:00-03:00").getTime(); // fim da Cyber Monday

const CSS = `
  .bfb {
    position: relative; overflow: hidden; isolation: isolate;
    display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); align-items: center; gap: 24px;
    margin: 0 0 22px; padding: 16px 28px;
    border-radius: 18px; color: #fff; text-decoration: none;
    background:
      radial-gradient(60% 120% at 0% 100%, rgba(255, 122, 26, .28), transparent 60%),
      radial-gradient(50% 90% at 100% 0%, rgba(10, 75, 184, .55), transparent 65%),
      #07090f;
    box-shadow: 0 14px 36px rgba(5, 10, 30, .35);
  }
  /* listras diagonais bem leves no fundo */
  .bfb::before {
    content: ""; position: absolute; inset: 0; z-index: -1; opacity: .07;
    background: repeating-linear-gradient(-55deg, #fff 0 1px, transparent 1px 22px);
  }
  /* brilho que passa devagar */
  .bfb::after {
    content: ""; position: absolute; inset: -40% auto -40% -30%; width: 28%; z-index: -1;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .07), transparent);
    transform: skewX(-20deg); animation: bfb-brilho 7s ease-in-out infinite;
  }
  @keyframes bfb-brilho { 0%, 55% { left: -30%; } 100% { left: 130%; } }

  /* ---- arte: BLACK / FRIDAY ---- */
  .bfb-arte { position: relative; display: flex; flex-direction: column; width: max-content; max-width: 100%;
              padding-right: 96px; line-height: .86; user-select: none; justify-self: center; }
  .bfb-black, .bfb-friday {
    font-family: var(--fonte-titulo), system-ui, sans-serif; font-weight: 900; letter-spacing: -.02em;
    font-size: clamp(2rem, 4vw, 3.2rem); text-transform: uppercase;
  }
  .bfb-black { color: #fff; }
  .bfb-friday { color: transparent; -webkit-text-stroke: 2px #ff7a1a; text-shadow: 0 0 28px rgba(255, 122, 26, .35); }
  .bfb-ano {
    align-self: flex-start; margin-top: 7px; padding: 3px 9px; border-radius: 6px;
    background: #ff7a1a; color: #07090f; font-weight: 900; font-size: .78rem; letter-spacing: .3em;
  }
  /* etiquetas de desconto soltas */
  .bfb-tag {
    position: absolute; display: inline-flex; align-items: center; height: 26px; padding: 0 10px 0 15px;
    border-radius: 6px 999px 999px 6px; background: #fff; color: #07090f; font-weight: 900; font-size: .85rem;
    box-shadow: 0 6px 16px rgba(0, 0, 0, .35);
  }
  .bfb-tag::before { content: ""; position: absolute; left: 6px; top: 50%; width: 5px; height: 5px; margin-top: -2.5px;
                     border-radius: 50%; background: #07090f; }
  .bfb-tag--1 { right: 0; top: 2px; transform: rotate(8deg); background: #ff7a1a; color: #fff; }
  .bfb-tag--1::before { background: #fff; }
  .bfb-tag--2 { right: 12px; bottom: 26px; transform: rotate(-6deg); }

  /* ---- texto ---- */
  .bfb-texto { position: relative; }
  .bfb-selo {
    display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 999px;
    border: 1px solid rgba(255, 122, 26, .6); color: #ffb37a; font-size: .74rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase;
  }
  .bfb-titulo { margin: 8px 0 4px; font-family: var(--fonte-titulo), system-ui, sans-serif; font-size: clamp(1.15rem, 1.9vw, 1.5rem);
                font-weight: 800; line-height: 1.15; }
  .bfb-titulo span { color: #ff7a1a; }
  .bfb-sub { margin: 0 0 12px; color: #cbd5e1; font-size: .9rem; line-height: 1.4; }
  .bfb-botao {
    display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 20px; border-radius: 999px;
    background: #ff7a1a; color: #fff; font-weight: 800; font-size: .92rem; box-shadow: 0 8px 22px rgba(255, 122, 26, .35);
    transition: transform .15s, background .15s;
  }
  .bfb:hover .bfb-botao { background: #f06a0a; transform: translateX(3px); }

  @media (max-width: 860px) {
    .bfb { grid-template-columns: 1fr; padding: 18px 18px; gap: 12px; }
    .bfb-tag--2 { display: none; }
    .bfb-arte { justify-self: start; padding-right: 96px; }
  }
  @media (prefers-reduced-motion: reduce) { .bfb::after { animation: none; display: none; } }
`;

export default function BannerBlackFriday() {
  const agora = Date.now();
  if (agora >= BF_FIM) return null; // Black Friday terminou

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Link href="/black-friday" className="bfb" aria-label={`Black Friday ${ANO} no MukiOfertas: ver as ofertas`}>
        <div className="bfb-arte" aria-hidden="true">
          <span className="bfb-black">Black</span>
          <span className="bfb-friday">Friday</span>
          <span className="bfb-ano">{ANO}</span>
          <span className="bfb-tag bfb-tag--1">-70%</span>
          <span className="bfb-tag bfb-tag--2">-50%</span>
        </div>

        <div className="bfb-texto">
          <span className="bfb-selo">🖤 Black Friday MukiOfertas</span>
          <p className="bfb-titulo">
            As melhores ofertas da Black Friday <span>já começaram</span>
          </p>
          <p className="bfb-sub">Desconto real nas maiores lojas do Brasil, com preço conferido o dia todo.</p>
          <span className="bfb-botao">
            Ver ofertas da Black Friday <span aria-hidden="true">→</span>
          </span>
        </div>
      </Link>
    </>
  );
}

// Detalhe sutil no topo do site durante a temporada: uma linha fina laranja e preta que brilha.
// Usado no components/Casca.js, logo acima do cabeçalho. Some sozinha depois da Cyber Monday.
export function LinhaBlackFriday() {
  if (Date.now() >= BF_FIM) return null;
  return (
    <div
      aria-hidden="true"
      className="bf-linha"
      style={{
        height: 3,
        background: "linear-gradient(90deg, #07090f 0%, #ff7a1a 25%, #07090f 50%, #ff7a1a 75%, #07090f 100%)",
        backgroundSize: "200% 100%",
        animation: "bf-linha 6s linear infinite",
      }}
    >
      <style>{`@keyframes bf-linha { to { background-position: -200% 0; } }
        @media (prefers-reduced-motion: reduce) { .bf-linha { animation: none !important; } }`}</style>
    </div>
  );
}
