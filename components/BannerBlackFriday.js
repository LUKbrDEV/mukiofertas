// Faixa da Black Friday na página inicial, com a cara do MukiOfertas em tons escuros (fundo quase preto, azul da marca e laranja):
//   "ESQUENTA BLACK FRIDAY" · título · frase curta · botão laranja. Sem cronômetro e sem o mascote.
//   Mesma altura da faixa anterior. Depois da Black Friday (fim da Cyber Monday), some sozinha.
// Salve como components/BannerBlackFriday.js. Usado na página inicial (app/page.js).

import Link from "next/link";

const ANO = 2026;
export const BF_INICIO = new Date("2026-11-27T00:00:00-03:00").getTime(); // sexta-feira, 0h (Brasília)
export const BF_FIM = new Date("2026-12-01T00:00:00-03:00").getTime(); // fim da Cyber Monday

const CSS = `
  .bfx {
    position: relative; overflow: hidden; box-sizing: border-box;
    display: flex; align-items: center; gap: 18px; min-height: 92px; margin: 0 0 14px; padding: 14px 24px;
    border-radius: 16px; color: #fff;
    background: linear-gradient(105deg, #0a0c12 0%, #0f1524 55%, #13224a 100%);
    border: 1px solid #1c2233;
  }
  /* detalhes da marca: faixa laranja inclinada e bolinhas claras no canto */
  .bfx::before {
    content: ""; position: absolute; right: -40px; top: -60%; width: 300px; height: 220%;
    background: linear-gradient(180deg, #1d5bd8, #1749b4); transform: skewX(-18deg);
  }
  .bfx::after {
    content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: #ff7a1a;
  }
  .bfx > * { position: relative; z-index: 1; }
  .bfx-texto { flex: 1; min-width: 0; }
  .bfx-selo {
    display: inline-flex; align-items: center; height: 22px; padding: 0 10px; border-radius: 999px;
    background: #ff7a1a; color: #fff; font-size: 0.68rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase;
  }
  .bfx-titulo { margin: 6px 0 0; font-family: var(--fonte-titulo), system-ui, sans-serif; font-size: 1.45rem; font-weight: 800; line-height: 1.15; }
  .bfx-titulo em { font-style: normal; color: #ff9a3c; }
  .bfx-linha { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .bfx-sub { font-size: 0.84rem; color: #aab4c8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bfx-botao {
    flex: none; display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 22px; border-radius: 10px;
    background: #ff7a1a; color: #fff; font-weight: 800; font-size: 0.92rem; text-decoration: none; white-space: nowrap;
    box-shadow: 0 6px 16px rgba(0,0,0,.35);
  }
  .bfx-botao:hover { background: #f06a0a; }
  @media (max-width: 899px) {
    .bfx { flex-wrap: wrap; gap: 10px 14px; padding: 14px 14px 14px 18px; border-radius: 14px; min-height: 0; }
    .bfx::before { display: none; }
    .bfx-texto { flex-basis: 100%; }
    .bfx-titulo { font-size: 1.08rem; }
    .bfx-sub { display: none; }
    .bfx-botao { height: 40px; padding: 0 18px; font-size: 0.88rem; background: #ff7a1a; color: #fff; box-shadow: none; }
    .bfx-botao:hover { background: #f06a0a; }
  }
`;

export default function BannerBlackFriday() {
  const agora = Date.now();
  if (agora >= BF_FIM) return null; // Black Friday terminou
  const rolando = agora >= BF_INICIO;

  return (
    <section className="bfx" aria-label={`Black Friday ${ANO} no MukiOfertas`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bfx-texto">
        <div className="bfx-linha">
          <span className="bfx-selo">{rolando ? "Black Friday no ar" : "Esquenta Black Friday"}</span>
          <span className="bfx-sub">Desconto de verdade, preço conferido o dia todo e compra na loja oficial.</span>
        </div>
        <p className="bfx-titulo">
          {rolando ? (
            <>
              A Black Friday chegou no <em>MukiOfertas</em>
            </>
          ) : (
            <>
              As ofertas da Black Friday <em>já começaram</em>
            </>
          )}
        </p>
      </div>
      <Link href="/black-friday" className="bfx-botao">
        Ver ofertas da Black <span aria-hidden="true">→</span>
      </Link>
    </section>
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
