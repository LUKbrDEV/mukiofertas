"use client";

// Lista de desejos: as ofertas que a pessoa salvou no coração.
// Salve como app/desejos/page.js. Usa a tabela desejos (supabase-desejos.sql).

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { estaExpirada } from "../../lib/ofertas";
import { ouvirDesejos } from "../../lib/desejos";
import CardOferta from "../../components/CardOferta";
import { IconeCoracao } from "../../components/BotaoDesejo";

const CSS = `
  .ds { margin: 18px 0 40px; }
  .ds h1 { display: flex; align-items: center; gap: 10px; margin: 0 0 6px; font-size: 26px; color: #0f172a; }
  .ds h1 svg { color: #e11d48; }
  .ds-sub { margin: 0 0 18px; color: #475569; }
  .ds-vazio { max-width: 520px; margin: 30px auto; padding: 28px; text-align: center; background: #fff;
              border: 1px dashed #cbd5e1; border-radius: 16px; color: #475569; line-height: 1.5; }
  .ds-vazio svg { color: #cbd5e1; }
  .ds-btn { display: inline-flex; align-items: center; height: 44px; margin-top: 14px; padding: 0 22px; border-radius: 999px;
            background: #ff7a1a; color: #fff; font-weight: 800; text-decoration: none; }
  .ds-titulo2 { margin: 26px 0 12px; font-size: 18px; color: #64748b; }
`;

export default function PaginaDesejos() {
  const [usuario, setUsuario] = useState(undefined); // undefined = carregando
  const [ofertas, setOfertas] = useState(null);

  async function carregar() {
    const { data } = await supabase
      .from("desejos")
      .select("criado_em, oferta:ofertas(*)")
      .order("criado_em", { ascending: false })
      .limit(200);
    setOfertas((data ?? []).filter((d) => d.oferta).map((d) => ({ ...d.oferta, expirada: estaExpirada(d.oferta) })));
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUsuario(u);
      if (u) carregar();
    });
    // Tirou o coração de um card desta página: some da lista
    return ouvirDesejos((ids) => setOfertas((lista) => (lista && ids ? lista.filter((o) => ids.has(Number(o.id))) : lista)));
  }, []);

  if (usuario === undefined) return <div className="ds"><style>{CSS}</style><p className="ds-sub">Carregando...</p></div>;

  if (!usuario) {
    return (
      <div className="ds">
        <style>{CSS}</style>
        <div className="ds-vazio">
          <IconeCoracao tamanho={44} />
          <h2 style={{ margin: "10px 0 6px", color: "#0f172a" }}>Sua lista de desejos</h2>
          Toque no coração das ofertas para guardar o que você quer comprar e ver tudo junto aqui.
          <br />
          <Link href="/entrar?voltar=/desejos" className="ds-btn">
            Entrar para ver minha lista
          </Link>
        </div>
      </div>
    );
  }

  const noAr = (ofertas ?? []).filter((o) => !o.expirada);
  const acabaram = (ofertas ?? []).filter((o) => o.expirada);

  return (
    <div className="ds">
      <style>{CSS}</style>
      <h1>
        <IconeCoracao cheio tamanho={26} /> Lista de desejos
      </h1>
      <p className="ds-sub">
        As ofertas que você salvou. Quer ser avisado quando aparecer de novo?{" "}
        <Link href="/alertas" style={{ color: "#0a4bb8", fontWeight: 700 }}>
          Crie um alerta
        </Link>
        .
      </p>

      {ofertas === null ? (
        <p className="ds-sub">Carregando...</p>
      ) : ofertas.length === 0 ? (
        <div className="ds-vazio">
          <IconeCoracao tamanho={44} />
          <p style={{ margin: "10px 0 0" }}>
            Sua lista está vazia. Toque no <strong>coração</strong> de qualquer oferta para guardar aqui.
          </p>
          <Link href="/" className="ds-btn">
            Ver ofertas
          </Link>
        </div>
      ) : (
        <>
          {noAr.length > 0 && (
            <div className="grade-cartoes">
              {noAr.map((o) => (
                <CardOferta key={o.id} oferta={o} />
              ))}
            </div>
          )}
          {acabaram.length > 0 && (
            <>
              <h2 className="ds-titulo2">Estas já acabaram</h2>
              <div className="grade-cartoes">
                {acabaram.map((o) => (
                  <CardOferta key={o.id} oferta={o} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
