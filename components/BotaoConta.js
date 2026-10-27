"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Estilo "Olá, Entre ou Cadastre-se" com ícone de pessoa (inspirado no cabeçalho da Terabyte).
const CSS_CONTA = `
  .conta {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #ffffff;
    text-decoration: none;
    line-height: 1.2;
    white-space: nowrap;
  }

  .conta__icone {
    flex: none;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #ffffff;
    border-radius: 50%;
    color: #ffffff;
    transition: border-color 0.15s, color 0.15s;
  }

  .conta__texto {
    display: flex;
    flex-direction: column;
    font-size: 14px;
    font-weight: 400;
  }

  .conta__texto strong {
    font-weight: 700;
  }

  .conta__link {
    color: #ffffff;
    text-decoration: none;
  }

  .conta__link:hover,
  a.conta:hover .conta__texto strong {
    color: #ff7a1a;
  }

  a.conta:hover .conta__icone {
    border-color: #ff7a1a;
    color: #ff7a1a;
  }

  .conta__sair {
    padding: 0;
    margin: 0;
    border: none;
    background: none;
    color: #ffffff;
    font: inherit;
    font-weight: 700;
    text-align: left;
    cursor: pointer;
  }

  .conta__sair:hover {
    color: #ff7a1a;
  }

  /* Celular: só o ícone */
  @media (max-width: 768px) {
    .conta__texto { display: none; }
  }
`;

function IconePessoa() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="8" r="4.2" />
      <path d="M4 20.5c0-4.1 3.6-6.9 8-6.9s8 2.8 8 6.9c0 .3-.2.5-.5.5h-15c-.3 0-.5-.2-.5-.5z" />
    </svg>
  );
}

export default function BotaoConta() {
  const [usuario, setUsuario] = useState(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUsuario(data.session?.user ?? null);
      setPronto(true);
    });

    const { data: escuta } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      setUsuario(sessao?.user ?? null);
    });

    return () => escuta.subscription.unsubscribe();
  }, []);

  const estilo = <style dangerouslySetInnerHTML={{ __html: CSS_CONTA }} />;

  // Logado: "Olá, Fulano" + "Sair"
  if (usuario) {
    const nome = usuario.user_metadata?.nome || usuario.email.split("@")[0];
    return (
      <>
        {estilo}
        <div className="conta">
          <span className="conta__icone">
            <IconePessoa />
          </span>
          <span className="conta__texto">
            <span>
              Olá, <strong>{nome}</strong>
            </span>
            <button type="button" className="conta__sair" onClick={() => supabase.auth.signOut()}>
              Sair
            </button>
          </span>
        </div>
      </>
    );
  }

  // Visitante: "Olá, Entre ou / Cadastre-se" (tudo leva para /entrar)
  return (
    <>
      {estilo}
      <Link
        href="/entrar"
        className="conta"
        aria-label="Entrar ou cadastrar-se"
        style={{ visibility: pronto ? "visible" : "hidden" }}
      >
        <span className="conta__icone">
          <IconePessoa />
        </span>
        <span className="conta__texto">
          <span>
            Olá, <strong>Entre</strong> ou
          </span>
          <strong>Cadastre-se</strong>
        </span>
      </Link>
    </>
  );
}