"use client";

// Banner do topo da página /black-friday: texto + cronômetro ao vivo + Black November da KaBuM!
// Salve como components/HeroBlackFriday.js. Usado pelo app/black-friday/page.js.
//
// Efeitos leves (só CSS, não pesam): brilho que passa devagar, borda laranja animada,
// luzes flutuando ao fundo e o banner da KaBuM! se dissolvendo num degradê inclinado ( / ).
// Quem prefere menos movimento (configuração do celular/PC) vê tudo parado.

import Link from "next/link";
import { useEffect, useState } from "react";

// Banner da KaBuM! (o mesmo do BannerBlackFriday). Cole o seu link de afiliado da Awin para a
// página da Black November (Awin → Links → Link Builder). Vazio = ofertas da KaBuM! no site.
// Versão grande (1400x520, fundo transparente), montada a partir do banner original da KaBuM!
const KABUM_BANNER = "/banners/kabum-black-november-grande.png";
const KABUM_LINK = "";

const CSS = `
  .hbf {
    position: relative;
    overflow: hidden;
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
    margin-bottom: 22px;
    border-radius: 18px;
    color: #fff;
    background:
      radial-gradient(90% 120% at 0% 0%, rgba(255, 122, 26, 0.28), rgba(255, 122, 26, 0) 55%),
      linear-gradient(120deg, #05070d 0%, #0b1530 50%, #062a66 100%);
    box-shadow: 0 16px 40px rgba(5, 10, 30, 0.35);
    isolation: isolate;
  }
  /* borda laranja/dourada que corre devagar */
  .hbf::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 3;
    padding: 2px;
    border-radius: inherit;
    background: linear-gradient(90deg, #ff7a1a, #ffd166, #ff7a1a, #ff4d00);
    background-size: 300% 100%;
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    animation: hbf-borda 6s linear infinite;
    pointer-events: none;
  }
  /* luzes desfocadas flutuando ao fundo */
  .hbf-luz {
    position: absolute;
    z-index: 0;
    width: 260px;
    height: 260px;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.35;
    pointer-events: none;
    animation: hbf-flutuar 12s ease-in-out infinite alternate;
  }
  .hbf-luz--1 { top: -90px; left: 30%; background: #ff7a1a; }
  .hbf-luz--2 { bottom: -120px; left: 4%; background: #1d6bff; animation-delay: -6s; }

  .hbf-texto { position: relative; z-index: 2; padding: 30px 8px 30px 32px; }
  .hbf-selo {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 12px;
    padding: 4px 12px;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #0b1220;
    background: linear-gradient(90deg, #ff7a1a, #ffb347);
    border-radius: 999px;
  }
  .hbf-texto h1 {
    margin: 0 0 10px;
    font-family: var(--fonte-titulo), system-ui, sans-serif;
    font-size: clamp(1.7rem, 3.4vw, 2.6rem);
    font-weight: 800;
    line-height: 1.08;
    letter-spacing: -0.02em;
  }
  .hbf-texto h1 span {
    background: linear-gradient(90deg, #ff8a1f, #ffd166, #ff8a1f);
    background-size: 200% 100%;
    -webkit-background-clip: text;
            background-clip: text;
    color: transparent;
    animation: hbf-brilho-texto 5s ease-in-out infinite;
  }
  .hbf-texto p { max-width: 560px; margin: 0; font-size: 1rem; line-height: 1.55; color: #d5e1ff; }

  .hbf-relogio { display: flex; gap: 8px; margin: 18px 0 4px; }
  .hbf-bloco {
    width: 64px;
    padding: 8px 0 6px;
    text-align: center;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.16);
  }
  .hbf-numero {
    display: block;
    font-family: var(--fonte-titulo), system-ui, sans-serif;
    font-size: 1.7rem;
    font-weight: 800;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .hbf-rotulo { display: block; margin-top: 4px; font-size: 0.64rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #ffb27a; }
  .hbf-agora { margin: 18px 0 4px; font-family: var(--fonte-titulo), system-ui, sans-serif; font-size: 1.3rem; font-weight: 800; color: #ffd166; animation: hbf-pulso 1.6s ease-in-out infinite; }

  .hbf-acoes { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
  .hbf-acoes a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    font-weight: 800;
    font-size: 0.95rem;
    border-radius: 999px;
    color: #0b1220;
    background: #fff;
    text-decoration: none;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .hbf-acoes a:hover { transform: translateY(-2px); }
  .hbf-acoes a.hbf-principal { color: #fff; background: #ff7a1a; box-shadow: 0 8px 20px rgba(255, 122, 26, 0.45); }
  .hbf-acoes a.hbf-whats { color: #fff; background: #25d366; }

  /* metade direita: KaBuM! (o banner se dissolve no fundo; um risco de luz inclinado ( / ) separa as metades) */
  .hbf-kabum {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    min-height: 240px;
    padding: 10px 14px 10px 46px;
    /* a imagem da KaBuM! tem fundo transparente: ela "flutua" sobre o fundo do banner, sem corte */
    background: radial-gradient(60% 70% at 60% 50%, rgba(255, 90, 0, 0.12), rgba(255, 90, 0, 0) 70%);
  }
  .hbf-kabum::before {
    content: "";
    position: absolute;
    top: -10%;
    bottom: -10%;
    left: 34px;
    width: 3px;
    background: linear-gradient(180deg, rgba(255, 122, 26, 0), #ff7a1a 35%, #ffd166 55%, rgba(255, 122, 26, 0));
    transform: skewX(-28deg);
    box-shadow: 0 0 16px rgba(255, 122, 26, 0.85);
    opacity: 0.9;
    pointer-events: none;
  }
  .hbf-kabum img {
    position: relative;
    display: block;
    width: 100%;
    height: auto;
    filter: drop-shadow(0 8px 26px rgba(255, 90, 0, 0.22));
    transition: transform 0.35s ease;
  }
  .hbf-kabum:hover img { transform: scale(1.03); }
  /* faixa de luz que atravessa o banner da KaBuM! */
  .hbf-kabum::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(62deg, transparent 35%, rgba(255, 255, 255, 0.14) 48%, transparent 60%);
    background-size: 260% 100%;
    animation: hbf-reflexo 5.5s ease-in-out infinite;
    pointer-events: none;
  }
  .hbf-kabum-selo {
    position: absolute;
    right: 14px;
    bottom: 12px;
    z-index: 2;
    padding: 4px 10px;
    font-size: 0.74rem;
    font-weight: 800;
    color: #fff;
    background: rgba(0, 96, 177, 0.9);
    border-radius: 999px;
  }

  @keyframes hbf-borda { to { background-position: 300% 0; } }
  @keyframes hbf-flutuar { to { transform: translate(60px, 30px) scale(1.15); } }
  @keyframes hbf-brilho-texto { 50% { background-position: 100% 0; } }
  @keyframes hbf-reflexo { 0% { background-position: 130% 0; } 55%, 100% { background-position: -130% 0; } }
  @keyframes hbf-pulso { 50% { opacity: 0.55; } }
  @media (prefers-reduced-motion: reduce) {
    .hbf::before, .hbf-luz, .hbf-texto h1 span, .hbf-kabum::after, .hbf-agora { animation: none; }
  }

  /* celular e tablet: KaBuM! em cima, texto embaixo */
  @media (max-width: 900px) {
    .hbf { grid-template-columns: minmax(0, 1fr); }
    .hbf-kabum {
      order: -1;
      flex-direction: column;
      align-items: stretch;
      gap: 6px;
      min-height: 0;
      padding: 0 0 6px;
      background: none;
    }
    .hbf-kabum::before { display: none; }
    .hbf-kabum img { -webkit-mask-image: none; mask-image: none; }
    .hbf-kabum-selo { position: static; align-self: center; }
    .hbf-texto { padding: 6px 18px 22px; }
  }
  @media (max-width: 480px) {
    .hbf-relogio { justify-content: space-between; }
    .hbf-bloco { flex: 1; width: auto; }
    .hbf-acoes a { flex: 1 1 auto; justify-content: center; }
  }
`;

const doisDigitos = (n) => String(n).padStart(2, "0");
function partes(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return { dias: Math.floor(t / 86400), horas: Math.floor((t % 86400) / 3600), minutos: Math.floor((t % 3600) / 60), segundos: t % 60 };
}

export default function HeroBlackFriday({ ano, inicioIso, fimIso, dataTexto, titulo, whatsapp, telegram }) {
  const inicio = new Date(inicioIso).getTime();
  const fim = new Date(fimIso).getTime();
  const [agora, setAgora] = useState(null); // null até abrir no navegador

  useEffect(() => {
    setAgora(Date.now());
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const acontecendo = agora !== null && agora >= inicio && agora < fim;
  const terminou = agora !== null && agora >= fim;
  const t = agora === null ? null : partes(inicio - agora);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="hbf">
        <span className="hbf-luz hbf-luz--1" aria-hidden="true" />
        <span className="hbf-luz hbf-luz--2" aria-hidden="true" />

        <div className="hbf-texto">
          <span className="hbf-selo">🖤 Black Friday {ano}</span>
          <h1>
            {titulo.split(":")[0]}: <span>{titulo.split(":").slice(1).join(":").trim()}</span>
          </h1>
          <p>
            Desconto real nas maiores lojas do Brasil, atualizado o dia todo. A data oficial é {dataTexto}, mas as
            promoções já começaram.
          </p>

          {terminou ? null : acontecendo ? (
            <p className="hbf-agora">🔥 Está acontecendo agora!</p>
          ) : (
            <div className="hbf-relogio" role="timer" aria-label={`Tempo até a Black Friday ${ano}`}>
              {[
                ["dias", "Dias"],
                ["horas", "Horas"],
                ["minutos", "Min"],
                ["segundos", "Seg"],
              ].map(([k, r]) => (
                <div key={k} className="hbf-bloco">
                  <span className="hbf-numero">{t ? doisDigitos(t[k]) : "--"}</span>
                  <span className="hbf-rotulo">{r}</span>
                </div>
              ))}
            </div>
          )}

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

        <a
          className="hbf-kabum"
          href={KABUM_LINK || "/categoria/hardware?loja=kabum"}
          {...(KABUM_LINK ? { target: "_blank", rel: "sponsored noopener noreferrer" } : {})}
          aria-label="Black November da KaBuM!: até 70% off"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={KABUM_BANNER} alt="Black das Blacks KaBuM!: até 70% off" width={1400} height={520} />
          <span className="hbf-kabum-selo">Black November KaBuM! →</span>
        </a>
      </header>
    </>
  );
}
