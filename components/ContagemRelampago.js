"use client";

// Selo "⚡ Relâmpago" com contagem regressiva ("acaba em 2h 15min").
// Salve como components/ContagemRelampago.js. Usado no CardOferta e na página do produto.
// Quando a hora passa, o selo some sozinho (a oferta continua, só deixa de ser relâmpago).

import { useEffect, useState } from "react";
import IconeRaio from "./IconeRaio";
import { tempoQueFalta } from "../lib/relampago.mjs";

const CSS = `
  .cr-pag { display: inline-flex; align-items: center; gap: 8px; margin: 12px 0 0; padding: 8px 12px; border-radius: 10px;
            background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; font-weight: 800; font-size: 0.92rem; }
  .cr-pag b { font-variant-numeric: tabular-nums; color: #c2410c; }
  .cr-card-tempo { font-variant-numeric: tabular-nums; }
`;

export default function ContagemRelampago({ ate, variante = "card" }) {
  const [agora, setAgora] = useState(null); // null no servidor: evita diferença entre servidor e navegador

  useEffect(() => {
    setAgora(Date.now());
    const passo = () => {
      const falta = new Date(ate).getTime() - Date.now();
      return falta < 3600000 ? 1000 : 30000; // última hora: atualiza a cada segundo
    };
    let id = setTimeout(function tic() {
      setAgora(Date.now());
      id = setTimeout(tic, passo());
    }, passo());
    return () => clearTimeout(id);
  }, [ate]);

  const falta = tempoQueFalta(ate, agora ?? Date.now());
  if (!falta) return null;

  if (variante === "pagina") {
    const hora = new Date(ate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
    return (
      <p className="cr-pag" role="timer" aria-live="off">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <IconeRaio tamanho={14} /> Oferta relâmpago · acaba em <b>{agora ? falta : "…"}</b>
        <span style={{ fontWeight: 600, color: "#9a3412" }}>(até {hora})</span>
      </p>
    );
  }

  return (
    <span className="cv2-relampago" title={`Promoção relâmpago: acaba em ${falta}`} role="timer" aria-live="off">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <IconeRaio tamanho={11} />
      <span className="cr-card-tempo">{agora ? falta : "Relâmpago"}</span>
    </span>
  );
}
