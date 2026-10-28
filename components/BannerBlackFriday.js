"use client";

// Banner da Black Friday com contagem regressiva. Salve como components/BannerBlackFriday.js.
// Uso na página inicial (app/page.js), logo acima da faixa de Promoções relâmpago:
//   import BannerBlackFriday from "../components/BannerBlackFriday";
//   <BannerBlackFriday />
//
// Antes da data: mostra o cronômetro. Durante a Black Friday (até o fim da Cyber Monday):
// mostra "Está acontecendo agora". Depois disso, o banner some sozinho.

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const ANO = 2026;
const INICIO = new Date("2026-11-27T00:00:00-03:00").getTime(); // sexta-feira, 0h (horário de Brasília)
const FIM = new Date("2026-12-01T00:00:00-03:00").getTime(); // fim da Cyber Monday

const CSS = `
  .bfb {
    position: relative;
    overflow: hidden;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 22px;
    margin: 0 0 26px;
    padding: 20px 26px;
    border-radius: 16px;
    color: #fff;
    background:
      radial-gradient(120% 140% at 100% 0%, rgba(255, 122, 26, 0.35) 0%, rgba(255, 122, 26, 0) 55%),
      linear-gradient(120deg, #05070d 0%, #0b1530 55%, #062a66 100%);
    box-shadow: 0 10px 30px rgba(5, 10, 30, 0.35);
    text-decoration: none;
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
    width: 78px;
    height: 78px;
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
    font-size: clamp(1.25rem, 2.4vw, 1.9rem);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }
  .bfb-titulo span { color: #ff8a1f; }
  .bfb-sub { margin: 6px 0 0; font-size: 0.95rem; color: #c9d6f5; }
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
  .bfb:hover .bfb-botao { background: #ff8d3a; transform: translateY(-1px); }
  .bfb-agora {
    font-family: var(--fonte-titulo), system-ui, sans-serif;
    font-size: 1.3rem;
    font-weight: 800;
    color: #ffd166;
    animation: bfb-pulso 1.6s ease-in-out infinite;
  }
  @keyframes bfb-borda { to { background-position: 200% 0; } }
  @keyframes bfb-pulso { 50% { opacity: 0.55; } }
  @media (prefers-reduced-motion: reduce) {
    .bfb::before, .bfb-agora { animation: none; }
  }
  @media (max-width: 900px) {
    .bfb { grid-template-columns: auto minmax(0, 1fr); }
    .bfb-lado { grid-column: 1 / -1; flex-direction: row; justify-content: space-between; flex-wrap: wrap; }
  }
  @media (max-width: 560px) {
    .bfb { padding: 16px; gap: 14px; }
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
      <Link href="/black-friday" className="bfb" aria-label={`Black Friday ${ANO}: ver as ofertas`}>
        <Image src="/logo-cabecalho.png" alt="" width={78} height={78} className="bfb-mascote" />

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
    </>
  );
}