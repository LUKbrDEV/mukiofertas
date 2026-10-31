"use client";

// Banner da Black Friday com contagem regressiva. Salve como components/BannerBlackFriday.js.
// Uso na página inicial (app/page.js), logo acima da faixa de Promoções relâmpago:
//   import BannerBlackFriday from "../components/BannerBlackFriday";
//   <BannerBlackFriday />
//
// Antes da data: mostra o cronômetro. Durante a Black Friday (até o fim da Cyber Monday):
// mostra "Está acontecendo agora". Depois disso, o banner some sozinho.
//
// Metade esquerda: banner da Black November da KaBuM! (public/banners/kabum-black-november.png),
// que se mistura ao fundo escuro com um degradê inclinado ( / ).

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const ANO = 2026;
const INICIO = new Date("2026-11-27T00:00:00-03:00").getTime(); // sexta-feira, 0h (horário de Brasília)
const FIM = new Date("2026-12-01T00:00:00-03:00").getTime(); // fim da Cyber Monday

// Banner da KaBuM! (metade esquerda). Para onde vai o clique nele:
// cole aqui o seu link de afiliado da Awin para a página da Black November da KaBuM!
// (Awin → Links → Link Builder). Vazio = abre as ofertas da KaBuM! aqui no site.
const KABUM_BANNER = "/banners/kabum-black-november.png";
const KABUM_LINK = "";

const CSS = `
  .bfb {
    position: relative;
    overflow: hidden;
    display: grid;
    /* metade esquerda: KaBuM! | direita: mascote, texto e cronômetro */
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: stretch;
    margin: 0 0 26px;
    min-height: 150px;
    border-radius: 16px;
    color: #fff;
    background:
      radial-gradient(120% 140% at 100% 0%, rgba(255, 122, 26, 0.35) 0%, rgba(255, 122, 26, 0) 55%),
      linear-gradient(120deg, #05070d 0%, #0b1530 55%, #062a66 100%);
    box-shadow: 0 10px 30px rgba(5, 10, 30, 0.35);
  }
  /* ---- metade esquerda: banner da KaBuM! ---- */
  .bfb-kabum {
    position: relative;
    display: block;
    min-height: 150px;
    background: #040608; /* mesma cor do fundo do banner da KaBuM! */
    /* degradê inclinado ( / ): o banner se dissolve no fundo escuro da direita */
    -webkit-mask-image: linear-gradient(118deg, #000 0%, #000 72%, rgba(0, 0, 0, 0.5) 84%, transparent 98%);
            mask-image: linear-gradient(118deg, #000 0%, #000 72%, rgba(0, 0, 0, 0.5) 84%, transparent 98%);
  }
  .bfb-kabum img {
    position: absolute;
    top: 50%;
    left: 0;
    width: 82%;
    height: auto;
    transform: translateY(-50%);
    transition: transform 0.3s ease;
  }
  .bfb-kabum:hover img { transform: translateY(-50%) scale(1.02); }
  /* faixa de luz inclinada que passa pelo banner */
  .bfb-kabum::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.10) 45%, transparent 60%);
    background-size: 250% 100%;
    animation: bfb-brilho 5s ease-in-out infinite;
    pointer-events: none;
  }
  /* ---- metade direita: o banner de sempre ---- */
  .bfb-info {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 18px;
    padding: 18px 24px 18px 0;
    color: #fff;
    text-decoration: none;
  }
  /* risco de luz laranja inclinado ( / ) na divisa entre as duas metades */
  .bfb-info::before {
    content: "";
    position: absolute;
    top: -10%;
    bottom: -10%;
    left: -46px;
    width: 3px;
    background: linear-gradient(180deg, rgba(255, 122, 26, 0), #ff7a1a 35%, #ffd166 55%, rgba(255, 122, 26, 0));
    transform: skewX(-28deg);
    filter: blur(0.5px);
    box-shadow: 0 0 14px rgba(255, 122, 26, 0.8);
    opacity: 0.85;
    pointer-events: none;
  }
  .bfb::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 2px;
    background: linear-gradient(90deg, #ff7a1a, #ffd166, #ff7a1a);
    background-size: 200% 100%;
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    animation: bfb-borda 4s linear infinite;
    pointer-events: none;
  }
  .bfb-mascote {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: 3px solid #ff7a1a;
    box-shadow: 0 0 0 6px rgba(255, 122, 26, 0.18);
    background: #fff;
    flex: none;
  }
  .bfb-texto { min-width: 0; }
  .bfb-selo {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    padding: 3px 10px;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #0b1220;
    background: linear-gradient(90deg, #ff7a1a, #ffb347);
    border-radius: 999px;
  }
  .bfb-titulo {
    margin: 0;
    font-family: var(--fonte-titulo), system-ui, sans-serif;
    font-size: clamp(1.15rem, 1.6vw, 1.65rem);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }
  .bfb-titulo span { color: #ff8a1f; }
  .bfb-sub { margin: 6px 0 0; font-size: 0.88rem; color: #c9d6f5; }
  .bfb-lado { display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .bfb-relogio { display: flex; gap: 8px; }
  .bfb-bloco {
    width: 66px;
    padding: 8px 0 6px;
    text-align: center;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.16);
    backdrop-filter: blur(2px);
  }
  .bfb-numero {
    display: block;
    font-family: var(--fonte-titulo), system-ui, sans-serif;
    font-size: 1.8rem;
    font-weight: 800;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    color: #fff;
  }
  .bfb-rotulo {
    display: block;
    margin-top: 4px;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #ffb27a;
  }
  .bfb-botao {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    font-weight: 800;
    font-size: 0.95rem;
    color: #fff;
    background: #ff7a1a;
    border-radius: 999px;
    box-shadow: 0 6px 18px rgba(255, 122, 26, 0.45);
    transition: transform 0.15s, background 0.15s;
    white-space: nowrap;
  }
  .bfb-info:hover .bfb-botao { background: #ff8d3a; transform: translateY(-1px); }
  .bfb-agora {
    font-family: var(--fonte-titulo), system-ui, sans-serif;
    font-size: 1.3rem;
    font-weight: 800;
    color: #ffd166;
    animation: bfb-pulso 1.6s ease-in-out infinite;
  }
  @keyframes bfb-borda { to { background-position: 200% 0; } }
  @keyframes bfb-brilho { 0% { background-position: 120% 0; } 60%, 100% { background-position: -120% 0; } }
  @keyframes bfb-pulso { 50% { opacity: 0.55; } }
  @media (prefers-reduced-motion: reduce) {
    .bfb::before, .bfb-agora, .bfb-kabum::after { animation: none; }
  }
  /* telas médias: o cronômetro desce para baixo do texto */
  @media (max-width: 1280px) {
    .bfb-info { grid-template-columns: auto minmax(0, 1fr); }
    .bfb-lado { grid-column: 1 / -1; flex-direction: row; justify-content: space-between; flex-wrap: wrap; }
  }
  /* celular e tablet: KaBuM! em cima (degradê para baixo), o resto embaixo */
  @media (max-width: 900px) {
    .bfb { grid-template-columns: minmax(0, 1fr); }
    .bfb-kabum {
      min-height: 0;
      aspect-ratio: 695 / 100;
      -webkit-mask-image: linear-gradient(170deg, #000 0%, #000 70%, transparent 100%);
              mask-image: linear-gradient(170deg, #000 0%, #000 70%, transparent 100%);
    }
    .bfb-kabum img { width: 100%; }
    .bfb-info { padding: 4px 16px 16px; }
    .bfb-info::before { display: none; }
  }
  @media (max-width: 560px) {
    .bfb-info { gap: 14px; }
    .bfb-mascote { width: 56px; height: 56px; }
    .bfb-sub { display: none; }
    .bfb-lado { flex-direction: column; align-items: stretch; }
    .bfb-relogio { justify-content: space-between; }
    .bfb-bloco { flex: 1; width: auto; }
    .bfb-numero { font-size: 1.5rem; }
    .bfb-botao { justify-content: center; }
  }
`;

function partes(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    dias: Math.floor(total / 86400),
    horas: Math.floor((total % 86400) / 3600),
    minutos: Math.floor((total % 3600) / 60),
    segundos: total % 60,
  };
}

const doisDigitos = (n) => String(n).padStart(2, "0");

export default function BannerBlackFriday() {
  // null até montar no navegador (evita diferença entre o servidor e o navegador)
  const [agora, setAgora] = useState(null);

  useEffect(() => {
    setAgora(Date.now());
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (agora !== null && agora >= FIM) return null; // Black Friday terminou

  const acontecendo = agora !== null && agora >= INICIO;
  const t = agora === null ? null : partes(INICIO - agora);
  const blocos = [
    ["dias", "Dias"],
    ["horas", "Horas"],
    ["minutos", "Min"],
    ["segundos", "Seg"],
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bfb">
        {/* Metade esquerda: Black November da KaBuM! */}
        <a
          className="bfb-kabum"
          href={KABUM_LINK || "/categoria/hardware?loja=kabum"}
          {...(KABUM_LINK ? { target: "_blank", rel: "sponsored noopener noreferrer" } : {})}
          aria-label="Black November da KaBuM!: até 70% off"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={KABUM_BANNER} alt="Black das Blacks KaBuM!: até 70% off" width={695} height={87} />
        </a>

        {/* Metade direita: Black Friday do MukiOfertas com o cronômetro */}
        <Link href="/black-friday" className="bfb-info" aria-label={`Black Friday ${ANO}: ver as ofertas`}>
        <Image src="/logo-cabecalho.png" alt="" width={64} height={64} className="bfb-mascote" />

        <div className="bfb-texto">
          <span className="bfb-selo">🖤 Black Friday {ANO}</span>
          <p className="bfb-titulo">
            {acontecendo ? (
              <>
                A Black Friday <span>começou!</span>
              </>
            ) : (
              <>
                As maiores ofertas do ano <span>estão chegando</span>
              </>
            )}
          </p>
          <p className="bfb-sub">
            {acontecendo
              ? "Descontos reais nas maiores lojas do Brasil, atualizados o tempo todo."
              : "27 de novembro. Acompanhe aqui as promoções que já começaram."}
          </p>
        </div>

        <div className="bfb-lado">
          {acontecendo ? (
            <span className="bfb-agora">Está acontecendo agora</span>
          ) : (
            <div className="bfb-relogio" role="timer" aria-live="off" aria-label="Tempo até a Black Friday">
              {blocos.map(([chave, rotulo]) => (
                <div className="bfb-bloco" key={chave}>
                  <span className="bfb-numero">{t ? doisDigitos(t[chave]) : "--"}</span>
                  <span className="bfb-rotulo">{rotulo}</span>
                </div>
              ))}
            </div>
          )}
          <span className="bfb-botao">
            Ver ofertas da Black Friday <span aria-hidden="true">→</span>
          </span>
        </div>
        </Link>
      </div>
    </>
  );
}
