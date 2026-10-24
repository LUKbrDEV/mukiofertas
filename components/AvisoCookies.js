"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CHAVE = "mukiofertas-cookies-ok";

export default function AvisoCookies() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CHAVE)) setVisivel(true);
    } catch {
      setVisivel(true);
    }
  }, []);

  function aceitar() {
    try {
      localStorage.setItem(CHAVE, "1");
    } catch {
      // sem armazenamento disponível: o aviso só some até a próxima visita
    }
    setVisivel(false);
  }

  if (!visivel) return null;

  return (
    <div className="cookies" role="dialog" aria-label="Aviso de cookies">
      <p>
        Usamos cookies para o site funcionar, medir o uso e exibir anúncios. Ao continuar
        navegando, você concorda com isso. Saiba mais na{" "}
        <Link href="/privacidade">Política de Privacidade</Link>.
      </p>
      <button type="button" className="botao cookies-botao" onClick={aceitar}>
        Entendi
      </button>
    </div>
  );
}