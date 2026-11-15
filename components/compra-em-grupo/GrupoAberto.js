"use client";

// Um grupo aberto na página do produto: "Entrar no grupo" + "Entrei" + "Já fechou".
// Salve como components/compra-em-grupo/GrupoAberto.js.

import { useEffect, useState } from "react";

const textoFaltam = (n) => (n <= 0 ? "Grupo completo" : n === 1 ? "Falta 1 pessoa" : `Faltam ${n} pessoas`);
const CHAVE = "mk-grupos-clicados"; // lembra neste navegador em quais grupos a pessoa já clicou

function lerClicados() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) || "{}");
  } catch {
    return {};
  }
}

function horasRestantes(expira) {
  const ms = new Date(expira).getTime() - Date.now();
  if (ms <= 0) return "expirando";
  const h = Math.floor(ms / 3600000);
  return h >= 1 ? `fecha em até ${h}h` : `fecha em até ${Math.max(1, Math.round(ms / 60000))} min`;
}

export default function GrupoAberto({ grupo }) {
  const [faltam, setFaltam] = useState(grupo.faltam);
  const [fechado, setFechado] = useState(false);
  const [feito, setFeito] = useState(null); // "entrei" | "fechou"
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setFeito(lerClicados()[grupo.id] ?? null);
  }, [grupo.id]);

  async function avisar(acao) {
    setEnviando(true);
    setMsg("");
    try {
      const r = await fetch("/api/compra-em-grupo/atualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: grupo.id, acao }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(j.erro || "Não deu certo agora. Tente de novo.");
      } else {
        setFaltam(j.faltam ?? faltam);
        if (j.status === "fechado") setFechado(true);
        setFeito(acao);
        try {
          localStorage.setItem(CHAVE, JSON.stringify({ ...lerClicados(), [grupo.id]: acao }));
        } catch {}
        setMsg(acao === "entrei" ? "Valeu! Atualizamos as vagas." : "Obrigado pelo aviso!");
      }
    } catch {
      setMsg("Sem conexão. Tente de novo.");
    }
    setEnviando(false);
  }

  if (fechado || faltam <= 0) {
    return (
      <div className="cg-grupo" style={{ opacity: 0.7 }}>
        <div className="cg-grupo-info">
          <strong style={{ color: "#15803d" }}>✅ Grupo fechado</strong>
          {msg && <span>{msg}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="cg-grupo">
      <div className="cg-grupo-info">
        <strong>👥 {textoFaltam(faltam)}</strong>
        <span>
          {grupo.autor_nome ? `Criado por ${grupo.autor_nome} · ` : ""}
          {horasRestantes(grupo.expira_em)}
        </span>
        {msg && <span style={{ color: "#0f172a" }}>{msg}</span>}
      </div>
      <div className="cg-grupo-acoes">
        <a className="cg-btn" href={grupo.link} target="_blank" rel="nofollow noopener sponsored">
          Entrar no grupo
        </a>
        {!feito && (
          <>
            <button type="button" className="cg-btn cg-btn--claro cg-btn--pequeno" disabled={enviando} onClick={() => avisar("entrei")}>
              Já entrei
            </button>
            <button type="button" className="cg-btn cg-btn--claro cg-btn--pequeno" disabled={enviando} onClick={() => avisar("fechou")}>
              Já fechou
            </button>
          </>
        )}
      </div>
    </div>
  );
}
