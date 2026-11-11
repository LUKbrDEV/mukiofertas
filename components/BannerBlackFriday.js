// Faixa da Black Friday do MukiOfertas (visual do Home_desktop):
//   mascote · "ESQUENTA BLACK DAS BLACKS" · "As ofertas da Black Friday já começaram" · contagem em caixas · botão.
//   No celular fica mais baixa: mascote, "Black Friday em 17d 06h 12m" e o botão.
// Antes da Black a contagem vai até o início; durante, até o fim (Cyber Monday). Depois, a faixa some sozinha.
// Salve como components/BannerBlackFriday.js. Usado na página inicial (app/page.js).

import Link from "next/link";
import ContagemBlack from "./ContagemBlack";

const ANO = 2026;
export const BF_INICIO = new Date("2026-11-27T00:00:00-03:00").getTime(); // sexta-feira, 0h (Brasília)
export const BF_FIM = new Date("2026-12-01T00:00:00-03:00").getTime(); // fim da Cyber Monday

const CSS = `
  .bfx {
    display: flex; align-items: center; gap: 18px; margin: 0 0 14px; padding: 14px 22px;
    border-radius: 16px; color: #fff; background: #0b0d12;
    background-image: radial-gradient(60% 140% at 100% 50%, rgba(255,122,26,.16), transparent 60%);
  }
  .bfx-mascote { flex: none; width: 64px; height: 64px; border-radius: 50%; border: 2px solid #ff7a1a; background: #fff; object-fit: cover; }
  .bfx-texto { flex: 1; min-width: 0; }
  .bfx-selo { display: block; color: #ff9a3c; font-size: 0.72rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
  .bfx-titulo { margin: 2px 0 0; font-family: var(--fonte-titulo), system-ui, sans-serif; font-size: 1.45rem; font-weight: 800; line-height: 1.15; }
  .bfx-titulo-cel { display: none; }
  .bfx-caixas { display: flex; gap: 8px; flex: none; }
  .bfx-caixa {
    display: flex; flex-direction: column; align-items: center; justify-content: center; width: 58px; height: 56px;
    border-radius: 10px; background: #1b1f29; border: 1px solid #2a2f3b; line-height: 1;
  }
  .bfx-caixa strong { font-size: 1.35rem; font-weight: 800; font-variant-numeric: tabular-nums; }
  .bfx-caixa small { margin-top: 4px; font-size: 0.66rem; color: #aab2c0; }
  .bfx-botao {
    flex: none; display: inline-flex; align-items: center; height: 44px; padding: 0 22px; border-radius: 10px;
    background: #ff7a1a; color: #fff; font-weight: 800; font-size: 0.92rem; text-decoration: none; white-space: nowrap;
  }
  .bfx-botao:hover { background: #f06a0a; }
  .bfx-contagem-texto { font-variant-numeric: tabular-nums; }
  @media (max-width: 899px) {
    .bfx { flex-wrap: wrap; gap: 12px 14px; padding: 14px; border-radius: 14px; }
    .bfx-mascote { width: 56px; height: 56px; }
    .bfx-caixas, .bfx-selo, .bfx-titulo-pc { display: none; }
    .bfx-titulo-cel { display: inline; }
    .bfx-titulo { font-size: 1rem; }
    .bfx-contagem-texto { white-space: nowrap; }
    .bfx-botao { height: 40px; padding: 0 18px; font-size: 0.88rem; }
  }
  @media (max-width: 420px) { .bfx-botao { margin-left: 70px; } }
`;

export default function BannerBlackFriday() {
  const agora = Date.now();
  if (agora >= BF_FIM) return null; // Black Friday terminou
  const rolando = agora >= BF_INICIO;

  return (
    <section className="bfx" aria-label={`Black Friday ${ANO} no MukiOfertas`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="bfx-mascote" src="/logo-cabecalho.png" alt="" />
      <div className="bfx-texto">
        <span className="bfx-selo">{rolando ? "Black Friday no ar" : "Esquenta Black das Blacks"}</span>
        <p className="bfx-titulo">
          <span className="bfx-titulo-pc">
            {rolando ? "A Black Friday chegou: corre que acaba logo" : "As ofertas da Black Friday já começaram"}
          </span>
          <span className="bfx-titulo-cel">
            {rolando ? "Black acaba em " : "Black Friday em "}
            <ContagemBlack inicio={BF_INICIO} fim={BF_FIM} variante="texto" />
          </span>
        </p>
      </div>
      <ContagemBlack inicio={BF_INICIO} fim={BF_FIM} />
      <Link href="/black-friday" className="bfx-botao">
        Ver ofertas da Black
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
