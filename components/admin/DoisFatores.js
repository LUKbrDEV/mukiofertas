"use client";

// Verificação em 2 etapas (2FA) do painel admin, usando o MFA do próprio Supabase (TOTP).
// Funciona com Google Authenticator, Microsoft Authenticator, Authy, 1Password etc.
// Salve como components/admin/DoisFatores.js
//
//   modo="cadastrar" → mostra o QR Code para ligar o 2FA pela primeira vez
//   modo="verificar" → pede o código de 6 dígitos do aplicativo

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import MolduraLogin from "./MolduraLogin";

export default function DoisFatores({ modo, email, aoConcluir }) {
  const [fatorId, setFatorId] = useState(null);
  const [qr, setQr] = useState("");
  const [segredo, setSegredo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function preparar() {
      setErro("");
      const { data: lista, error: erroLista } = await supabase.auth.mfa.listFactors();
      if (erroLista) return setErro("Não deu para carregar o 2FA. Atualize a página.");

      if (modo === "verificar") {
        const fator = lista.totp?.[0];
        if (!cancelado) setFatorId(fator?.id ?? null);
        return;
      }

      // Cadastro: apaga tentativas antigas que ficaram pela metade (QR gerado e nunca confirmado)
      for (const f of lista.all ?? []) {
        if (f.factor_type === "totp" && f.status !== "verified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `MukiOfertas Admin ${Date.now()}`,
        issuer: "MukiOfertas",
      });
      if (error) return setErro("Não deu para gerar o QR Code: " + error.message);
      if (cancelado) return;
      setFatorId(data.id);
      setQr(data.totp.qr_code);
      setSegredo(data.totp.secret);
    }

    preparar();
    return () => {
      cancelado = true;
    };
  }, [modo]);

  async function confirmar(e) {
    e.preventDefault();
    if (!fatorId) return;
    setErro("");
    setEnviando(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: fatorId,
      code: codigo.replace(/\D/g, ""),
    });
    setEnviando(false);
    if (error) {
      setCodigo("");
      return setErro("Código incorreto ou vencido. Espere o próximo código do aplicativo e tente de novo.");
    }
    aoConcluir();
  }

  return (
    <MolduraLogin>
      <form onSubmit={confirmar} className="adm-entrada-form">
        <span className="adm-entrada-selo">🛡️ Verificação em 2 etapas</span>
        <h1>{modo === "cadastrar" ? "Proteja a sua conta" : "Confirme que é você"}</h1>

        {modo === "cadastrar" ? (
          <>
            <p>
              <strong>Ative a verificação em 2 etapas</strong> para entrar no painel.
            </p>
            <p>
              1. Abra o <strong>Google Authenticator</strong> (ou Microsoft Authenticator / Authy) no celular e
              escaneie o QR Code:
            </p>
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qr}
                alt="QR Code do 2FA"
                width={200}
                height={200}
                style={{ display: "block", margin: "8px auto", background: "#fff", padding: 8, borderRadius: 8 }}
              />
            ) : (
              <p className="adm-centro">Gerando QR Code...</p>
            )}
            {segredo && (
              <p style={{ fontSize: 12, wordBreak: "break-all" }}>
                Não consegue escanear? Digite esta chave no aplicativo: <code>{segredo}</code>
              </p>
            )}
            <p>2. Digite o código de 6 dígitos que aparece no aplicativo:</p>
          </>
        ) : (
          <p>
            Digite o código de 6 dígitos do seu aplicativo autenticador
            {email ? (
              <>
                {" "}
                para <strong>{email}</strong>
              </>
            ) : null}
            .
          </p>
        )}

        <label className="adm-entrada-campo">
          <span>Código</span>
          <input
            className="adm-entrada-codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            placeholder="000000"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            autoFocus
            required
          />
        </label>

        {erro && <p className="adm-entrada-erro">⚠️ {erro}</p>}

        <button className="adm-entrada-botao" disabled={enviando || !fatorId}>
          {enviando ? "Conferindo..." : modo === "cadastrar" ? "Ativar e entrar" : "Entrar"}
        </button>

        <button type="button" className="adm-entrada-sair" onClick={() => supabase.auth.signOut()}>
          Sair e entrar com outra conta
        </button>
      </form>
    </MolduraLogin>
  );
}
