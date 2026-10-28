"use client";

// Cupom com botão de copiar. Salve como components/BotaoCupom.js.
// Uso: <BotaoCupom codigo={oferta.cupom} />            (tamanho normal, página do produto)
//      <BotaoCupom codigo={oferta.cupom} compacto />   (versão menor, para os cards)

import { useState } from "react";

const CSS = `
  .cupom-copiar {
    box-sizing: border-box;
    width: 100%;
    display: flex;
    align-items: stretch;
    border: 1.5px dashed #ff7a1a;
    border-radius: 8px;
    background: #fff7ed;
    overflow: hidden;
    font-size: 14px;
  }
  .cupom-copiar__codigo {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    color: #c2410c;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cupom-copiar__codigo strong { letter-spacing: 0.03em; }
  .cupom-copiar__botao {
    flex: none;
    border: none;
    border-left: 1.5px dashed #ff7a1a;
    background: #ff7a1a;
    color: #fff;
    font-weight: 700;
    font-size: 13px;
    padding: 0 14px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .cupom-copiar__botao:hover { background: #f06a0a; }
  .cupom-copiar__botao[data-copiado="true"] { background: #15803d; border-left-color: #15803d; }
  .cupom-copiar--compacto { font-size: 12px; border-radius: 6px; }
  .cupom-copiar--compacto .cupom-copiar__codigo { padding: 5px 8px; }
  .cupom-copiar--compacto .cupom-copiar__botao { font-size: 12px; padding: 0 10px; }
`;

export default function BotaoCupom({ codigo, compacto = false }) {
  const [copiado, setCopiado] = useState(false);
  if (!codigo) return null;

  async function copiar(evento) {
    // Dentro de um card que é link: não abre a oferta ao clicar em copiar
    evento.preventDefault();
    evento.stopPropagation();
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      // Navegadores antigos ou sem permissão
      const campo = document.createElement("textarea");
      campo.value = codigo;
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      campo.select();
      document.execCommand("copy");
      campo.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className={compacto ? "cupom-copiar cupom-copiar--compacto" : "cupom-copiar"}>
        <span className="cupom-copiar__codigo">
          Cupom <strong>{codigo}</strong>
        </span>
        <button
          type="button"
          className="cupom-copiar__botao"
          data-copiado={copiado}
          onClick={copiar}
          aria-label={`Copiar o cupom ${codigo}`}
        >
          {copiado ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <span aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {copiado ? "Cupom copiado" : ""}
      </span>
    </>
  );
}