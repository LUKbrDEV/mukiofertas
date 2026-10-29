"use client";

// Botão flutuante no canto inferior direito: abre um menu com o grupo do WhatsApp, o canal do Telegram,
// o Instagram e o TikTok do MukiOfertas.
// Salve como components/BotaoComunidade.js.
// Uso (no app/layout.js): <BotaoComunidade whatsapp={...} telegram={...} instagram={...} tiktok={...} />
// Cada rede só aparece se o link dela estiver preenchido.

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const CSS = `
  .bc {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 55;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
    font-family: var(--fonte-texto), system-ui, sans-serif;
  }
  .bc-botao {
    position: relative;
    width: 60px;
    height: 60px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 50%;
    color: #fff;
    background: linear-gradient(135deg, #ff8a1f, #ff6a00);
    box-shadow: 0 8px 24px rgba(255, 106, 0, 0.45);
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .bc-botao:hover { transform: scale(1.07); box-shadow: 0 10px 28px rgba(255, 106, 0, 0.55); }
  .bc-botao:focus-visible { outline: 3px solid #0a4bb8; outline-offset: 3px; }
  .bc-botao svg { transition: transform 0.25s ease; }
  .bc-botao[aria-expanded="true"] svg { transform: rotate(90deg); }

  /* Anel pulsando para chamar atenção (só enquanto fechado) */
  .bc-botao[aria-expanded="false"]::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 3px solid #ff8a1f;
    animation: bc-pulso 2.2s ease-out infinite;
  }
  @keyframes bc-pulso {
    0% { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(1.6); opacity: 0; }
  }

  .bc-balao {
    position: absolute;
    right: 70px;
    bottom: 14px;
    padding: 7px 12px;
    font-size: 0.82rem;
    font-weight: 700;
    white-space: nowrap;
    color: #0f172a;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.18);
    pointer-events: none;
    animation: bc-aparece 0.3s ease;
  }
  .bc-balao::after {
    content: "";
    position: absolute;
    right: -6px;
    top: 50%;
    width: 12px;
    height: 12px;
    background: #fff;
    transform: translateY(-50%) rotate(45deg);
  }

  .bc-menu {
    width: 270px;
    padding: 14px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.25);
    animation: bc-aparece 0.2s ease;
    transform-origin: bottom right;
  }
  .bc-menu-titulo { margin: 0 0 2px; font-size: 1rem; font-weight: 800; color: #0f172a; }
  .bc-menu-sub { margin: 0 0 12px; font-size: 0.82rem; color: #64748b; }
  .bc-opcao {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 12px;
    margin-top: 8px;
    border-radius: 12px;
    color: #fff;
    font-weight: 700;
    text-decoration: none;
    transition: filter 0.15s ease, transform 0.15s ease;
  }
  .bc-opcao:hover { filter: brightness(1.07); transform: translateY(-1px); }
  .bc-opcao small { display: block; font-size: 0.74rem; font-weight: 500; opacity: 0.9; }
  .bc-opcao--whatsapp { background: #25d366; }
  .bc-opcao--telegram { background: #229ed9; }
  .bc-opcao--instagram { background: linear-gradient(45deg, #f9a825 0%, #e1306c 45%, #833ab4 100%); }
  .bc-opcao--tiktok { background: #111111; }
  .bc-divisor {
    margin: 14px 0 0;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #64748b;
  }
  .bc-icone {
    flex: none;
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
  }

  @keyframes bc-aparece {
    from { opacity: 0; transform: translateY(8px) scale(0.96); }
    to { opacity: 1; transform: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .bc-botao[aria-expanded="false"]::before, .bc-menu, .bc-balao { animation: none; }
  }
  @media (max-width: 639px) {
    .bc { right: 14px; bottom: 14px; }
    .bc-botao { width: 54px; height: 54px; }
    .bc-balao { display: none; }
  }
`;

function IconeChat() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5v-8Z"
        fill="currentColor"
      />
      <circle cx="8.5" cy="9.5" r="1.3" fill="#ff7a1a" />
      <circle cx="12" cy="9.5" r="1.3" fill="#ff7a1a" />
      <circle cx="15.5" cy="9.5" r="1.3" fill="#ff7a1a" />
    </svg>
  );
}

function IconeFechar() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function IconeWhatsapp() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

function IconeTelegram() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.4 4.3 18.3 19c-.2 1-.9 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.8-7.9c.4-.3-.1-.5-.6-.2L6.2 13 1.6 11.6c-1-.3-1-1 .2-1.5L20 3.2c.8-.3 1.6.2 1.4 1.1Z" />
    </svg>
  );
}

function IconeInstagram() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" />
    </svg>
  );
}

function IconeTiktok() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 3c.3 2.3 1.6 3.9 3.9 4.1v3.1c-1.4.1-2.7-.3-3.9-1.1v6.1c0 3.6-2.6 5.8-5.6 5.8-3.2 0-5.6-2.5-5.6-5.6 0-3.4 2.9-5.9 6.5-5.4v3.2c-1.7-.4-3.4.6-3.4 2.3 0 1.4 1.1 2.4 2.4 2.4 1.5 0 2.5-1 2.5-2.8V3h3.2Z" />
    </svg>
  );
}

export default function BotaoComunidade({ whatsapp, telegram, instagram, tiktok }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [balao, setBalao] = useState(false);
  const caixa = useRef(null);

  // Balão "Receba as ofertas!" aparece uma vez, alguns segundos depois de abrir o site
  useEffect(() => {
    let visto = false;
    try {
      visto = sessionStorage.getItem("bc-balao") === "1";
    } catch {}
    if (visto) return;
    const mostrar = setTimeout(() => setBalao(true), 4000);
    const esconder = setTimeout(() => setBalao(false), 12000);
    try {
      sessionStorage.setItem("bc-balao", "1");
    } catch {}
    return () => {
      clearTimeout(mostrar);
      clearTimeout(esconder);
    };
  }, []);

  // Fecha ao clicar fora, apertar Esc ou trocar de página
  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => {
      if (caixa.current && !caixa.current.contains(e.target)) setAberto(false);
    };
    const esc = (e) => e.key === "Escape" && setAberto(false);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  useEffect(() => setAberto(false), [pathname]);

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/entrar") || pathname?.startsWith("/bio")) return null;
  if (!whatsapp && !telegram && !instagram && !tiktok) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bc" ref={caixa}>
        {aberto && (
          <div className="bc-menu" id="bc-menu" role="dialog" aria-label="Receba as ofertas e siga nas redes">
            <p className="bc-menu-titulo">Receba as ofertas primeiro 🔥</p>
            <p className="bc-menu-sub">Entre no nosso grupo e seja avisado das promoções relâmpago.</p>
            {whatsapp && (
              <a className="bc-opcao bc-opcao--whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer">
                <span className="bc-icone">
                  <IconeWhatsapp />
                </span>
                <span>
                  Grupo do WhatsApp
                  <small>Ofertas direto no seu celular</small>
                </span>
              </a>
            )}
            {telegram && (
              <a className="bc-opcao bc-opcao--telegram" href={telegram} target="_blank" rel="noopener noreferrer">
                <span className="bc-icone">
                  <IconeTelegram />
                </span>
                <span>
                  Canal do Telegram
                  <small>Todas as promoções em tempo real</small>
                </span>
              </a>
            )}

            {(instagram || tiktok) && <p className="bc-divisor">Siga o MukiOfertas</p>}
            {instagram && (
              <a className="bc-opcao bc-opcao--instagram" href={instagram} target="_blank" rel="noopener noreferrer">
                <span className="bc-icone">
                  <IconeInstagram />
                </span>
                <span>
                  Instagram
                  <small>Oficial da MukiOfertas!</small>
                </span>
              </a>
            )}
            {tiktok && (
              <a className="bc-opcao bc-opcao--tiktok" href={tiktok} target="_blank" rel="noopener noreferrer">
                <span className="bc-icone">
                  <IconeTiktok />
                </span>
                <span>
                  TikTok
                  <small>Vídeos das melhores ofertas</small>
                </span>
              </a>
            )}
          </div>
        )}

        <div style={{ position: "relative" }}>
          {balao && !aberto && <span className="bc-balao">Receba as ofertas! 👋</span>}
          <button
            type="button"
            className="bc-botao"
            aria-expanded={aberto}
            aria-controls="bc-menu"
            aria-label={aberto ? "Fechar" : "Entrar no grupo de ofertas"}
            onClick={() => {
              setAberto((a) => !a);
              setBalao(false);
            }}
          >
            {aberto ? <IconeFechar /> : <IconeChat />}
          </button>
        </div>
      </div>
    </>
  );
}