"use client";

import { useState } from "react";

export default function CardCupom({ cupom }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(cupom.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copie o código:", cupom.codigo);
    }
  }

  return (
    <article className="cartao-cupom">
      <span className="loja">{cupom.loja}</span>
      <h3>{cupom.descricao}</h3>
      <div className="cupom-codigo">
        <code>{cupom.codigo}</code>
        <button type="button" onClick={copiar}>
          {copiado ? "Copiado!" : "Copiar"}
        </button>
      </div>
      {cupom.validade && (
        <p className="cupom-validade">Válido até {cupom.validade.split("-").reverse().join("/")}</p>
      )}
      {cupom.link && (
        <a href={cupom.link} target="_blank" rel="sponsored noopener noreferrer" className="botao">
          Ir para a loja
        </a>
      )}
    </article>
  );
}
