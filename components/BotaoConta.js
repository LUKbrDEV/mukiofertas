"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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

  if (usuario) {
    const nome = usuario.user_metadata?.nome || usuario.email.split("@")[0];
    return (
      <div className="topo-usuario">
        <span className="topo-nome so-desktop">Olá, {nome}</span>
        <button type="button" className="topo-sair" onClick={() => supabase.auth.signOut()}>
          Sair
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/entrar"
      className="topo-login"
      style={{ visibility: pronto ? "visible" : "hidden" }}
    >
      Entrar<span className="so-desktop"> ou inscrever-se</span>
    </Link>
  );
}