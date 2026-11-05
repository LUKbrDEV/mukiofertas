"use client";

// Botões pequenos do canto superior direito da página do produto: 🔔 Alerta e Compartilhar.
// Salve como components/AcoesOferta.js. Usado pelo app/oferta/[id]/page.js.

import Link from "next/link";
import { useState } from "react";
import BotaoDesejo from "./BotaoDesejo";

const CSS = `
  .ao { display: flex; gap: 8px; flex: none; }
  .ao-btn {
    display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px;
    border: 1px solid #e2e8f0; border-radius: 999px; background: #fff; color: #334155;
    font: inherit; font-size: 0.86rem; font-weight: 700; text-decoration: none; cursor: pointer;
    transition: border-color .15s, color .15s, background .15s;
  }
  .ao-btn:hover { border-color: #0a4bb8; color: #0a4bb8; background: #f5f8ff; }
  .ao-btn svg { flex: none; }
  @media (max-width: 520px) { .ao-btn span { display: none; } .ao-btn { width: 36px; padding: 0; justify-content: center; } }
`;

function IconeSino() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function IconeCompartilhar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

export default function AcoesOferta({ ofertaId, titulo, termoAlerta, expirada = false }) {
  const [copiado, setCopiado] = useState(false);

  async function compartilhar() {
    const url = window.location.href.split("#")[0];
    const texto = `${titulo} — achei no MukiOfertas`;
    try {
      if (navigator.share) {
        await navigator.share({ title: titulo, text: texto, url });
        return;
      }
    } catch {
      return; // a pessoa fechou a janela de compartilhar
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`, "_blank", "noopener");
    }
  }

  return (
    <div className="ao">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {ofertaId && <BotaoDesejo ofertaId={ofertaId} variante="pagina" />}
      <Link
        href={`/alertas?termo=${encodeURIComponent(termoAlerta)}`}
        className="ao-btn"
        title={expirada ? "Me avise quando voltar" : "Me avise quando aparecer uma oferta parecida"}
      >
        <IconeSino />
        <span>{expirada ? "Avise-me" : "Criar alerta"}</span>
      </Link>
      <button type="button" className="ao-btn" onClick={compartilhar} title="Compartilhar esta oferta">
        <IconeCompartilhar />
        <span>{copiado ? "Link copiado!" : "Compartilhar"}</span>
      </button>
    </div>
  );
}
