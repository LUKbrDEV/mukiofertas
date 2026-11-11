"use client";

// Coluna da direita da página inicial (computador), no visual do Home_desktop:
//   antes do ranking: "Receba no WhatsApp" (QR code + Entrar no grupo) com o botão "Prefiro o Telegram",
//   que troca a caixa para o Telegram (QR code do canal) — e "Prefiro o WhatsApp" volta; depois, "Cupons do dia"
//   depois do ranking: botão "Enviar uma oferta" e o card do guia de compra
// Salve como components/LateralHome.js. Usado pelo app/page.js (dentro do HomeComRanking).

import { useState } from "react";
import { SITE } from "../lib/site";
import { tituloDoCupom } from "../lib/titulo-cupom.mjs";
import { lojaDoNome } from "../data/lojas";

const CSS = `
  .lh { display: flex; flex-direction: column; gap: 14px; margin-bottom: 14px; }
  .lh-caixa { padding: 18px; background: #fff; border: 1px solid #e6e9ef; border-radius: 16px; }
  .lh-caixa h2 { margin: 0; font-family: var(--fonte-titulo), system-ui, sans-serif; font-size: 1.05rem; font-weight: 800; color: #0f172a; }
  .lh-sub { margin: 4px 0 14px; font-size: 0.84rem; color: #475569; line-height: 1.4; }
  .lh-zap { display: grid; grid-template-columns: minmax(0, 1fr) 96px; gap: 12px; align-items: center; }
  .lh-passos { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .lh-passos li { display: flex; align-items: center; gap: 10px; font-size: 0.84rem; color: #0f172a; line-height: 1.25; }
  .lh-passos b { flex: none; width: 24px; height: 24px; border-radius: 50%; background: #dcfce7; color: #166534; display: inline-flex; align-items: center; justify-content: center; font-size: 0.78rem; }
  .lh-qr { width: 96px; height: 96px; padding: 6px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
  .lh-qr { overflow: hidden; }
  .lh-qr img { width: 100%; height: 100%; display: block; font-size: 0; color: transparent; }
  .lh-botao { display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; margin-top: 12px; border-radius: 10px; font-weight: 700; font-size: 0.92rem; text-decoration: none; }
  .lh-botao--zap { background: #15803d; color: #fff; }
  .lh-botao--zap:hover { background: #126b33; }
  .lh-botao--tg { margin-top: 10px; background: #fff; color: #0f172a; border: 1px solid #e2e8f0; font-weight: 600; }
  .lh-botao--tg svg { color: #1d5bd8; }
  .lh-botao--tg:hover { border-color: #94a3b8; }
  .lh-botao--tgprincipal { background: #229ed9; color: #fff; }
  .lh-botao--tgprincipal:hover { background: #1b87bb; }
  .lh-botao--troca { width: 100%; cursor: pointer; font: inherit; font-size: 0.92rem; }
  .lh-botao--troca .lh-ic-zap { color: #15803d; }
  .lh-caixa[data-canal="telegram"] .lh-passos b { background: #e0f2fe; color: #0369a1; }
  .lh-botao--enviar { background: #fff; color: #1d5bd8; border: 1.5px solid #1d5bd8; }
  .lh-botao--enviar:hover { background: #eaf1fe; }

  .lh-cab { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px; }
  .lh-cab a { font-size: 0.86rem; font-weight: 700; color: #1d5bd8; text-decoration: none; }
  .lh-cupons { list-style: none; margin: 0; padding: 0; }
  .lh-cupom { display: flex; align-items: center; gap: 10px; padding: 11px 0; border-top: 1px solid #eef1f5; }
  .lh-cupom-info { flex: 1; min-width: 0; }
  .lh-cupom-loja { display: block; font-size: 0.74rem; font-weight: 600; color: #64748b; }
  .lh-cupom-titulo { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 0.84rem; color: #0f172a; line-height: 1.3; }
  .lh-codigo {
    flex: none; max-width: 120px; height: 34px; padding: 0 10px; border: 1px dashed #f0a070; border-radius: 8px;
    background: #fff7f1; color: #b4410c; font: inherit; font-size: 0.76rem; font-weight: 800; letter-spacing: .03em;
    cursor: copy; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: inline-flex; align-items: center; justify-content: center; text-decoration: none;
  }
  .lh-codigo[data-copiado="true"] { border-color: #15803d; background: #f0fdf4; color: #15803d; }

  .lh-guia { display: block; padding: 16px 18px; border: 1px solid #fde3c8; border-radius: 16px; background: #fff7ed; text-decoration: none; }
  .lh-guia small { display: block; font-size: 0.74rem; font-weight: 700; color: #b4410c; }
  .lh-guia strong { display: block; margin-top: 4px; font-family: var(--fonte-titulo), system-ui, sans-serif; font-size: 1.02rem; line-height: 1.3; color: #0f172a; }
  .lh-guia:hover strong { color: #1d5bd8; }
`;

function IconeZap() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />
    </svg>
  );
}

function CodigoCupom({ codigo }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      const campo = document.createElement("textarea");
      campo.value = codigo;
      document.body.appendChild(campo);
      campo.select();
      document.execCommand("copy");
      campo.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  }
  return (
    <button type="button" className="lh-codigo" onClick={copiar} data-copiado={copiado} title="Clique para copiar">
      {copiado ? "Copiado!" : codigo}
    </button>
  );
}

// Os dois canais: o botão de baixo troca a caixa (título, QR code e botão principal)
const CANAIS = {
  whatsapp: {
    titulo: "Receba no WhatsApp",
    texto: "As ofertas relâmpago chegam primeiro no grupo do Muki.",
    passo2: "Pronto, você já está no grupo",
    rota: "/grupo",
    botao: "Entrar no grupo",
    classe: "lh-botao--zap",
    troca: "Prefiro o Telegram",
    alt: "QR code do grupo do WhatsApp do MukiOfertas",
  },
  telegram: {
    titulo: "Receba no Telegram",
    texto: "Todas as ofertas, na hora, no canal do Muki no Telegram.",
    passo2: "Pronto, é só tocar em Participar",
    rota: "/telegram",
    botao: "Entrar no canal",
    classe: "lh-botao--tgprincipal",
    troca: "Prefiro o WhatsApp",
    alt: "QR code do canal do Telegram do MukiOfertas",
  },
};

function IconeTelegram({ className }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M21 4 3 11l6 2 2 6 3-4 5 4z" />
    </svg>
  );
}

// "Receba no WhatsApp/Telegram" + "Cupons do dia" (vão acima do ranking)
export function LateralAntes({ cupons = [] }) {
  const [canal, setCanal] = useState("whatsapp");
  const c = CANAIS[canal];
  const outro = canal === "whatsapp" ? "telegram" : "whatsapp";
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(SITE.url + c.rota)}`;
  return (
    <div className="lh">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <section className="lh-caixa" aria-labelledby="lh-zap" data-canal={canal} aria-live="polite">
        <h2 id="lh-zap">{c.titulo}</h2>
        <p className="lh-sub">{c.texto}</p>
        <div className="lh-zap">
          <ol className="lh-passos">
            <li>
              <b>1</b> Aponte a câmera do celular
            </li>
            <li>
              <b>2</b> {c.passo2}
            </li>
          </ol>
          <span className="lh-qr">
            {/* key: troca a imagem na hora ao mudar de canal */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={canal} src={qr} alt={c.alt} loading="lazy" width="84" height="84" />
          </span>
        </div>
        <a className={`lh-botao ${c.classe}`} href={c.rota} target="_blank" rel="noopener noreferrer">
          {canal === "whatsapp" ? <IconeZap /> : <IconeTelegram />} {c.botao}
        </a>
        <button type="button" className="lh-botao lh-botao--tg lh-botao--troca" onClick={() => setCanal(outro)}>
          {outro === "telegram" ? <IconeTelegram /> : <span className="lh-ic-zap"><IconeZap /></span>}
          {c.troca}
        </button>
      </section>

      {cupons.length > 0 && (
        <section className="lh-caixa" aria-labelledby="lh-cupons">
          <div className="lh-cab">
            <h2 id="lh-cupons">Cupons do dia</h2>
            <a href="/cupons-de-desconto">Ver todos</a>
          </div>
          <ul className="lh-cupons">
            {cupons.map((c) => {
              const loja = lojaDoNome(c.loja);
              return (
                <li key={c.id} className="lh-cupom">
                  <span className="lh-cupom-info">
                    <span className="lh-cupom-loja">{loja?.nome ?? c.loja}</span>
                    <span className="lh-cupom-titulo">{tituloDoCupom(c.titulo)}</span>
                  </span>
                  {c.cupom ? (
                    <CodigoCupom codigo={c.cupom} />
                  ) : (
                    <a className="lh-codigo" href={`/ir/${c.id}`} target="_blank" rel="sponsored noopener noreferrer">
                      Ver cupons
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

// "Enviar uma oferta" + guia de compra (vão abaixo do ranking)
export function LateralDepois({ guia }) {
  return (
    <div className="lh" style={{ marginTop: 12 }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <a className="lh-botao lh-botao--enviar" href="/comunidade/enviar" style={{ marginTop: 0 }}>
        Enviar uma oferta
      </a>
      {guia && (
        <a className="lh-guia" href={`/guias/${guia.slug}`}>
          <small>
            Guia de compra{guia.minutos ? ` · ${guia.minutos} min` : ""}
          </small>
          <strong>{guia.titulo}</strong>
        </a>
      )}
    </div>
  );
}
