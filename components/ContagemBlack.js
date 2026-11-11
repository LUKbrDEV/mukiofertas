"use client";

// Contagem regressiva da Black Friday: em caixas (computador: 17 dias · 06 horas · 12 min)
// ou em texto (celular: "17d 06h 12m"). Antes da Black conta até o início; durante, até o fim.
// Salve como components/ContagemBlack.js. Usado no components/BannerBlackFriday.js.

import { useEffect, useState } from "react";

const dd = (n) => String(n).padStart(2, "0");

export default function ContagemBlack({ inicio, fim, variante = "caixas" }) {
  const [agora, setAgora] = useState(null); // null no servidor: evita diferença entre servidor e navegador
  useEffect(() => {
    setAgora(Date.now());
    const id = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const t = agora ?? inicio - 1; // no servidor mostra "--"
  const alvo = t < inicio ? inicio : fim;
  const falta = Math.max(0, alvo - t);
  const dias = Math.floor(falta / 86400000);
  const horas = Math.floor((falta % 86400000) / 3600000);
  const min = Math.floor((falta % 3600000) / 60000);
  const pronto = agora !== null;

  if (variante === "texto") {
    return (
      <span className="bfx-contagem-texto" suppressHydrationWarning>
        {pronto ? `${dias}d ${dd(horas)}h ${dd(min)}m` : "--"}
      </span>
    );
  }
  return (
    <div className="bfx-caixas" role="timer" aria-label={pronto ? `${dias} dias, ${horas} horas e ${min} minutos` : undefined}>
      {[
        [dias, "dias"],
        [horas, "horas"],
        [min, "min"],
      ].map(([n, rotulo]) => (
        <span key={rotulo} className="bfx-caixa" suppressHydrationWarning>
          <strong>{pronto ? dd(n) : "--"}</strong>
          <small>{rotulo}</small>
        </span>
      ))}
    </div>
  );
}
