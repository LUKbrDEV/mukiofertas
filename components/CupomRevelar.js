"use client";

// Cupom escondido por uma fita: ao clicar em "Copiar cupom", o código é copiado
// e a fita sai, revelando o cupom inteiro.
// Salve como components/CupomRevelar.js
// Uso: <CupomRevelar codigo="KABUM10" />

import { useState } from "react";
import { evento } from "./Analytics";

const CSS = `
  .cupom-rv {
    position: relative;
    box-sizing: border-box;
    width: 100%;
    height: 44px;
    border: 2px dashed #ff7a1a;
    border-radius: 10px;
    background: #fff7ed;
    overflow: hidden;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  /* o código fica encostado à direita: com a fita, só o finalzinho aparece */
  .cupom-rv__codigo {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 12px;
    font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: #c2410c;
    white-space: nowrap;
    overflow: hidden;
    transition: justify-content 0.3s;
  }
  .cupom-rv[data-revelado="true"] .cupom-rv__codigo { justify-content: center; user-select: all; }

  /* a fita: cobre 80% do cupom, com listras e bordas "rasgadas" */
  .cupom-rv__fita {
    position: absolute;
    top: -2px;
    bottom: -2px;
    left: -2px;
    width: calc(80% + 2px);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0 8px;
    border: none;
    color: #fff;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.02em;
    cursor: pointer;
    background:
      repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.16) 0 8px, rgba(255, 255, 255, 0) 8px 16px),
      linear-gradient(180deg, #ff8a2a, #f05a00);
    box-shadow: 3px 0 8px rgba(124, 45, 18, 0.28);
    clip-path: polygon(0 0, 100% 0, 96% 12%, 100% 25%, 96% 38%, 100% 50%, 96% 62%, 100% 75%, 96% 88%, 100% 100%, 0 100%);
    transform-origin: left center;
    transition: transform 0.45s cubic-bezier(0.5, 0, 0.75, 0), opacity 0.45s;
  }
  .cupom-rv:hover .cupom-rv__fita { filter: brightness(1.06); }
  .cupom-rv__fita:focus-visible { outline: 3px solid #0a4bb8; outline-offset: -3px; }
  /* revelado: a fita é "puxada" para fora */
  .cupom-rv[data-revelado="true"] .cupom-rv__fita {
    transform: translateX(-110%) rotate(-6deg);
    opacity: 0;
    pointer-events: none;
  }

  /* copiado: fica verde por 2 segundos */
  .cupom-rv[data-copiado="true"] { border-color: #15803d; background: #f0fdf4; }
  .cupom-rv[data-copiado="true"] .cupom-rv__codigo { color: #15803d; }
`;

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    // navegadores antigos ou sem permissão
    const campo = document.createElement("textarea");
    campo.value = texto;
    campo.style.position = "fixed";
    campo.style.opacity = "0";
    document.body.appendChild(campo);
    campo.select();
    document.execCommand("copy");
    campo.remove();
  }
}

export default function CupomRevelar({ codigo }) {
  const [revelado, setRevelado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  if (!codigo) return null;

  async function copiar(evento) {
    // dentro de um card que é link: não abre a loja ao clicar
    evento.preventDefault();
    evento.stopPropagation();
    await copiarTexto(codigo);
    if (!revelado) evento("copiar_cupom", { cupom: codigo });
    setRevelado(true);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div
        className="cupom-rv"
        data-revelado={revelado}
        data-copiado={copiado}
        onClick={revelado ? copiar : undefined}
        title={revelado ? "Clique para copiar de novo" : undefined}
      >
        <span className="cupom-rv__codigo">{copiado ? `✓ ${codigo}` : codigo}</span>
        <button
          type="button"
          className="cupom-rv__fita"
          onClick={copiar}
          aria-label="Copiar e revelar o cupom"
          tabIndex={revelado ? -1 : 0}
        >
          ✂️ Copiar cupom
        </button>
      </div>
      <span aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {revelado ? `Cupom ${codigo} copiado` : ""}
      </span>
    </>
  );
}
