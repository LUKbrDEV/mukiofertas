// Enfeites de Halloween do MukiOfertas.
// Salve como components/Halloween.js.
//
// - <Halloween />          (no app/layout.js): morcegos que atravessam a tela uma vez quando o site abre.
// - <EnfeiteCabecalho />   (no components/Casca.js): abóboras, aranha e morcegos dentro do cabeçalho azul.
//
// Só CSS e SVG, sem imagens nem JavaScript extra: não pesa no carregamento.
// Aparece sozinho de 24/10 a 01/11 (horário de Brasília). Fora dessas datas não aparece nada.
// Ano que vem é só trocar as duas datas abaixo.

const INICIO = new Date("2026-10-24T00:00:00-03:00");
const FIM = new Date("2026-11-02T00:00:00-03:00");

export function ehHalloween() {
  const agora = new Date();
  return agora >= INICIO && agora < FIM;
}

const CSS = `
  /* ============ Morcegos voando pela tela ============ */
  .hw-morcego {
    position: fixed;
    left: -80px;
    z-index: 100;
    pointer-events: none;
    color: #1e1b2e;
    opacity: 0;
    animation: hw-voo 7s ease-in-out 1.2s 1 forwards;
  }
  .hw-morcego svg {
    display: block;
    transform-origin: 50% 40%;
    animation: hw-asa 0.22s ease-in-out infinite alternate;
  }
  .hw-morcego--1 { top: 30vh; }
  .hw-morcego--2 { top: 40vh; animation-delay: 1.8s; animation-duration: 8s; }
  .hw-morcego--3 { top: 26vh; animation-delay: 2.6s; animation-duration: 6.5s; }

  @keyframes hw-voo {
    0%   { opacity: 0; transform: translate(0, 0); }
    8%   { opacity: 0.9; }
    30%  { transform: translate(32vw, -6vh); }
    55%  { transform: translate(58vw, 4vh); }
    80%  { transform: translate(84vw, -3vh); }
    92%  { opacity: 0.9; }
    100% { opacity: 0; transform: translate(calc(100vw + 120px), -8vh); }
  }
  @keyframes hw-asa {
    from { transform: scaleY(1); }
    to   { transform: scaleY(0.45); }
  }

  /* ============ Enfeite dentro do cabeçalho azul ============ */
  .hw-cab {
    position: relative;
    flex: none;
    align-self: stretch;
    display: flex;
    align-items: flex-end;
    gap: 6px;
    pointer-events: none;
    user-select: none;
  }
  .hw-cab--esq { width: 128px; padding-left: 26px; }
  .hw-cab--dir { width: 120px; justify-content: flex-end; }
  .hw-cab svg { display: block; }

  /* Aranha descendo do topo do cabeçalho e balançando */
  .hw-aranha {
    position: absolute;
    left: 4px;
    top: -12px;
    transform-origin: 50% 0;
    animation: hw-balanca 3.2s ease-in-out infinite alternate;
  }
  @keyframes hw-balanca {
    0%   { transform: rotate(-7deg) translateY(-3px); }
    100% { transform: rotate(7deg) translateY(3px); }
  }

  /* Abóbora com o rosto aceso piscando de leve */
  .hw-rosto { animation: hw-vela 1.6s ease-in-out infinite alternate; }
  @keyframes hw-vela {
    0%   { opacity: 0.7; }
    100% { opacity: 1; }
  }
  .hw-abobora--acesa { filter: drop-shadow(0 0 6px rgba(255, 170, 60, 0.55)); }

  /* Morceguinhos parados no ar, subindo e descendo */
  .hw-flutua { align-self: center; animation: hw-flutua 2.4s ease-in-out infinite alternate; }
  .hw-flutua--2 { align-self: flex-start; margin-top: 2px; animation-delay: -1.2s; }
  .hw-flutua svg { animation: hw-asa 0.35s ease-in-out infinite alternate; transform-origin: 50% 40%; }
  @keyframes hw-flutua {
    from { transform: translateY(-3px); }
    to   { transform: translateY(4px); }
  }

  /* Só nas telas largas, onde sobra espaço no cabeçalho */
  @media (max-width: 1279px) {
    .hw-cab { display: none; }
  }

  /* ============ Versão do celular ============ */
  /* No celular a busca desce para a segunda linha; os enfeites ficam
     sentados em cima da busca, embaixo do nome do site, e a aranha desce
     pela margem esquerda do cabeçalho. */
  .hw-cel { display: none; }
  @media (max-width: 768px) {
    .cabecalho-fixo .topo { position: relative; }
    .hw-cel {
      display: block;
      order: 4;
      flex: 0 0 100%;
      height: 0;
      margin-top: -10px;
      pointer-events: none;
      user-select: none;
    }
    .hw-cel svg { display: block; }
    .hw-cel-aboboras {
      position: absolute;
      left: 84px;
      bottom: 47px;
      z-index: 2;
      display: flex;
      align-items: flex-end;
      gap: 3px;
    }
    .hw-cel-morcego {
      position: absolute;
      left: 150px;
      bottom: 54px;
      z-index: 2;
      animation: hw-flutua 2.4s ease-in-out infinite alternate;
    }
    .hw-cel-morcego svg { animation: hw-asa 0.35s ease-in-out infinite alternate; transform-origin: 50% 40%; }
    .hw-cel-aranha {
      position: absolute;
      left: 2px;
      top: 0;
      z-index: 2;
      transform-origin: 50% 0;
      animation: hw-balanca 3.2s ease-in-out infinite alternate;
    }
  }

  /* Quem pediu menos movimento no sistema vê tudo parado */
  @media (prefers-reduced-motion: reduce) {
    .hw-morcego { display: none; }
    .hw-aranha, .hw-rosto, .hw-flutua, .hw-flutua svg,
    .hw-cel-morcego, .hw-cel-morcego svg, .hw-cel-aranha { animation: none; }
  }
`;

const ESTILO = <style dangerouslySetInnerHTML={{ __html: CSS }} />;

function Morcego({ largura = 40, cor = "currentColor" }) {
  return (
    <svg width={largura} viewBox="0 0 64 32" fill={cor} aria-hidden="true">
      <path d="M32 9c-1.6 0-2.6 1.2-3 2.4-.5-1-1.2-1.8-2-2.2.4 1.6.2 3-.4 4.2-3.4-3.8-9-5.6-14.6-4.6 3 1.8 4.6 4.8 4.4 8.2-3.6-1.8-8-1.6-11.4.6 4 .4 7.2 2.8 8.6 6.4 2.8-2 6.6-2.2 9.6-.4.8-2.6 3-4.4 5.6-4.8.6 1.4 1.8 2.2 3.2 2.2s2.6-.8 3.2-2.2c2.6.4 4.8 2.2 5.6 4.8 3-1.8 6.8-1.6 9.6.4 1.4-3.6 4.6-6 8.6-6.4-3.4-2.2-7.8-2.4-11.4-.6-.2-3.4 1.4-6.4 4.4-8.2-5.6-1-11.2.8-14.6 4.6-.6-1.2-.8-2.6-.4-4.2-.8.4-1.5 1.2-2 2.2-.4-1.2-1.4-2.4-3-2.4Z" />
    </svg>
  );
}

function Abobora({ largura = 40, acesa = false }) {
  return (
    <svg
      width={largura}
      viewBox="0 0 48 44"
      aria-hidden="true"
      className={acesa ? "hw-abobora--acesa" : undefined}
    >
      <path d="M22.5 9c-.3-3.6 1.4-6.4 4.6-7.6l1.6 2.2c-2.2.9-3.3 2.8-3.2 5.4z" fill="#4d7c0f" />
      <path d="M26 6c3-2.4 6.6-2.2 8.6-.4-2.6.4-4.8 1.6-6.4 3.4z" fill="#65a30d" />
      <ellipse cx="11" cy="27" rx="9" ry="12.5" fill="#e2580b" />
      <ellipse cx="37" cy="27" rx="9" ry="12.5" fill="#e2580b" />
      <ellipse cx="16.5" cy="27" rx="10.5" ry="14.5" fill="#f26b12" />
      <ellipse cx="31.5" cy="27" rx="10.5" ry="14.5" fill="#f26b12" />
      <ellipse cx="24" cy="27" rx="10" ry="15.5" fill="#ff8a1f" />
      <ellipse cx="20" cy="20" rx="2.4" ry="5" fill="#ffb066" opacity="0.55" />
      {acesa && (
        <g className="hw-rosto" fill="#ffd36b">
          <path d="M13.5 25h6.5l-3.2-6z" />
          <path d="M28 25h6.5l-3.3-6z" />
          <path d="M22.4 29.4h3.2L24 26.6z" />
          <path d="M12.5 31.5c3.6 6.4 19.4 6.4 23 0l-3 .8-1.6 2.3-2.4-1.9-2 2.3-2.5-2.2-2.5 2.2-2-2.3-2.4 1.9-1.6-2.3z" />
        </g>
      )}
    </svg>
  );
}

function Aranha({ largura = 20 }) {
  return (
    <svg width={largura} height={(largura * 52) / 20} viewBox="0 0 20 52" aria-hidden="true">
      <line x1="10" y1="0" x2="10" y2="38" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
      <g stroke="#0b1020" strokeWidth="1.4" fill="none" strokeLinecap="round">
        <path d="M7 42c-3-2-5-1-6 1M7 44c-3-1-5 0-6 3M7 46c-2 0-4 2-4 5M8 47c-1 1-2 3-1 5" />
        <path d="M13 42c3-2 5-1 6 1M13 44c3-1 5 0 6 3M13 46c2 0 4 2 4 5M12 47c1 1 2 3 1 5" />
      </g>
      <circle cx="10" cy="40" r="3" fill="#0b1020" />
      <ellipse cx="10" cy="45.5" rx="4.2" ry="5" fill="#0b1020" />
      <circle cx="8.9" cy="39.6" r="0.8" fill="#ff8a1f" />
      <circle cx="11.1" cy="39.6" r="0.8" fill="#ff8a1f" />
    </svg>
  );
}

// Fica dentro do cabeçalho azul: lado="esq" logo depois do logo, lado="dir" antes do botão da conta.
export function EnfeiteCabecalho({ lado = "esq" }) {
  if (!ehHalloween()) return null;

  // Celular: fica logo depois da busca no Casca.js (no computador fica escondido)
  if (lado === "cel") {
    return (
      <div className="hw-cel" aria-hidden="true">
        {ESTILO}
        <span className="hw-cel-aranha">
          <Aranha largura={13} />
        </span>
        <span className="hw-cel-aboboras">
          <Abobora largura={28} acesa />
          <Abobora largura={20} />
        </span>
        <span className="hw-cel-morcego">
          <Morcego largura={22} cor="#0b1020" />
        </span>
      </div>
    );
  }

  if (lado === "esq") {
    return (
      <div className="hw-cab hw-cab--esq" aria-hidden="true">
        {ESTILO}
        <span className="hw-aranha">
          <Aranha />
        </span>
        <Abobora largura={46} acesa />
        <Abobora largura={32} />
      </div>
    );
  }

  return (
    <div className="hw-cab hw-cab--dir" aria-hidden="true">
      {ESTILO}
      <span className="hw-flutua hw-flutua--2">
        <Morcego largura={24} cor="#0b1020" />
      </span>
      <span className="hw-flutua">
        <Morcego largura={36} cor="#0b1020" />
      </span>
      <Abobora largura={44} acesa />
    </div>
  );
}

// Morcegos que atravessam a tela uma vez quando o site abre (fica no app/layout.js).
export default function Halloween() {
  if (!ehHalloween()) return null;

  return (
    <>
      {ESTILO}
      <div className="hw-morcego hw-morcego--1" aria-hidden="true">
        <Morcego largura={46} />
      </div>
      <div className="hw-morcego hw-morcego--2" aria-hidden="true">
        <Morcego largura={34} />
      </div>
      <div className="hw-morcego hw-morcego--3" aria-hidden="true">
        <Morcego largura={26} />
      </div>
    </>
  );
}