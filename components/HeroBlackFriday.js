// Banner do topo da página /black-friday (arte própria do MukiOfertas, sem imagem de loja e sem cronômetro).
// Salve como components/HeroBlackFriday.js. Usado pelo app/black-friday/page.js.
// Mesmo visual do banner da página inicial (components/BannerBlackFriday.js).
// Quem prefere menos movimento (configuração do celular/PC) vê tudo parado.

import Link from "next/link";

const CSS = `
  .hbf {
    position: relative; overflow: hidden; isolation: isolate;
    display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); align-items: center; gap: 24px;
    margin-bottom: 22px; padding: 24px 32px; border-radius: 18px; color: #fff;
    background:
      radial-gradient(60% 120% at 100% 100%, rgba(255, 122, 26, .28), transparent 60%),
      radial-gradient(50% 90% at 0% 0%, rgba(10, 75, 184, .5), transparent 65%),
      #07090f;
    box-shadow: 0 14px 36px rgba(5, 10, 30, .35);
  }
  .hbf::before {
    content: ""; position: absolute; inset: 0; z-index: -1; opacity: .07;
    background: repeating-linear-gradient(-55deg, #fff 0 1px, transparent 1px 22px);
  }
  .hbf::after {
    content: ""; position: absolute; inset: -40% auto -40% -30%; width: 28%; z-index: -1;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .07), transparent);
    transform: skewX(-20deg); animation: hbf-brilho 7s ease-in-out infinite;
  }
  @keyframes hbf-brilho { 0%, 55% { left: -30%; } 100% { left: 130%; } }

  .hbf-selo {
    display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 999px;
    border: 1px solid rgba(255, 122, 26, .6); color: #ffb37a; font-size: .74rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase;
  }
  .hbf h1 { margin: 10px 0 8px; font-family: var(--fonte-titulo), system-ui, sans-serif; font-size: clamp(1.5rem, 2.8vw, 2.2rem);
            font-weight: 800; line-height: 1.12; }
  .hbf h1 span { color: #ff7a1a; }
  .hbf p { margin: 0 0 16px; max-width: 560px; color: #cbd5e1; font-size: .98rem; line-height: 1.5; }
  .hbf-acoes { display: flex; flex-wrap: wrap; gap: 10px; }
  .hbf-acoes a {
    display: inline-flex; align-items: center; gap: 6px; height: 42px; padding: 0 18px; border-radius: 999px;
    background: #fff; color: #0f172a; font-weight: 800; font-size: .92rem; text-decoration: none; transition: transform .15s, filter .15s;
  }
  .hbf-acoes a:hover { transform: translateY(-1px); filter: brightness(.96); }
  .hbf-acoes .hbf-principal { background: #ff7a1a; color: #fff; box-shadow: 0 8px 22px rgba(255, 122, 26, .35); }
  .hbf-acoes .hbf-whats { background: #22c55e; color: #fff; }

  /* arte: BLACK / FRIDAY */
  .hbf-arte { position: relative; justify-self: center; display: flex; flex-direction: column; width: max-content; max-width: 100%;
              padding-right: 104px; line-height: .86; user-select: none; }
  .hbf-black, .hbf-friday { font-family: var(--fonte-titulo), system-ui, sans-serif; font-weight: 900; letter-spacing: -.02em;
                            font-size: clamp(2.4rem, 5vw, 4rem); text-transform: uppercase; }
  .hbf-black { color: #fff; }
  .hbf-friday { color: transparent; -webkit-text-stroke: 2px #ff7a1a; text-shadow: 0 0 28px rgba(255, 122, 26, .35); }
  .hbf-ano { align-self: flex-start; margin-top: 8px; padding: 3px 10px; border-radius: 6px; background: #ff7a1a; color: #07090f;
             font-weight: 900; font-size: .85rem; letter-spacing: .3em; }
  .hbf-tag {
    position: absolute; display: inline-flex; align-items: center; height: 28px; padding: 0 11px 0 16px;
    border-radius: 6px 999px 999px 6px; background: #fff; color: #07090f; font-weight: 900; font-size: .9rem;
    box-shadow: 0 6px 16px rgba(0, 0, 0, .35);
  }
  .hbf-tag::before { content: ""; position: absolute; left: 6px; top: 50%; width: 5px; height: 5px; margin-top: -2.5px; border-radius: 50%; background: #07090f; }
  .hbf-tag--1 { right: 0; top: 4px; transform: rotate(8deg); background: #ff7a1a; color: #fff; }
  .hbf-tag--1::before { background: #fff; }
  .hbf-tag--2 { right: 12px; bottom: 30px; transform: rotate(-6deg); }

  @media (max-width: 860px) {
    .hbf { grid-template-columns: 1fr; padding: 20px 18px; gap: 16px; }
    .hbf-arte { order: -1; justify-self: start; padding-right: 92px; }
    .hbf-tag--2 { display: none; }
  }
  @media (prefers-reduced-motion: reduce) { .hbf::after { animation: none; display: none; } }
`;

export default function HeroBlackFriday({ ano, titulo, whatsapp, telegram }) {
  const [antes, ...resto] = String(titulo).split(":");
  const depois = resto.join(":").trim();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="hbf">
        <div className="hbf-texto">
          <span className="hbf-selo">🖤 Black Friday {ano}</span>
          <h1>
            {depois ? (
              <>
                {antes}: <span>{depois}</span>
              </>
            ) : (
              antes
            )}
          </h1>
          <p>
            As melhores ofertas da Black Friday já começaram. Desconto real nas maiores lojas do Brasil, com preço
            conferido e histórico de preço para você comprar sem cair em desconto falso.
          </p>

          <div className="hbf-acoes">
            <a href="#destaques" className="hbf-principal">
              Ver as melhores ofertas ↓
            </a>
            <Link href="/cupons-de-desconto">🎟️ Cupons</Link>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="hbf-whats">
                Grupo no WhatsApp
              </a>
            )}
            {telegram && (
              <a href={telegram} target="_blank" rel="noopener noreferrer">
                Telegram
              </a>
            )}
          </div>
        </div>

        <div className="hbf-arte" aria-hidden="true">
          <span className="hbf-black">Black</span>
          <span className="hbf-friday">Friday</span>
          <span className="hbf-ano">{ano}</span>
          <span className="hbf-tag hbf-tag--1">-70%</span>
          <span className="hbf-tag hbf-tag--2">-50%</span>
        </div>
      </header>
    </>
  );
}
