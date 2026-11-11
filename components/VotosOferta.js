"use client";

// Botões 👍 Like e 👎 Deslike com os números, no pé do card da oferta.
// Salve como components/VotosOferta.js. Usado pelo components/CardOferta.js.
// Lê a função votar_oferta do Supabase (votos.sql).
// O voto de cada pessoa fica lembrado no aparelho (localStorage) para o botão aparecer marcado.

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const CHAVE_VOTOS = "muki-votos";
const CHAVE_APARELHO = "muki-aparelho";

export function lerVotos() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_VOTOS) || "{}");
  } catch {
    return {};
  }
}

export function guardarVoto(id, voto) {
  try {
    const votos = lerVotos();
    if (voto) votos[id] = voto;
    else delete votos[id];
    localStorage.setItem(CHAVE_VOTOS, JSON.stringify(votos));
  } catch {
    // sem localStorage (aba anônima): só não lembra o voto
  }
}

export function idDoAparelho() {
  try {
    let id = localStorage.getItem(CHAVE_APARELHO);
    if (!id) {
      id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(CHAVE_APARELHO, id);
    }
    return id;
  } catch {
    return null;
  }
}

// XP por like: quem está logado e curte um produto ganha XP (tabela likes_usuarios).
// Conta 1 vez por produto: curtir de novo não soma, e tirar o like tira o XP.
// Grava pela função registrar_like_xp do Supabase (xp-likes.sql), que usa o login de quem clicou
// e não depende das regras de acesso (RLS) da tabela. Devolve "ok", "removido" ou "sem_login".
export async function registrarLikeNaConta(ofertaId, curtiu) {
  try {
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao?.session?.user?.id) return "sem_login"; // sem login o like vale, mas não dá XP
    const { data, error } = await supabase.rpc("registrar_like_xp", { p_oferta: Number(ofertaId), p_curtiu: curtiu });
    if (error) {
      console.warn("[xp] Não consegui registrar o XP do like:", error.message);
      return "erro";
    }
    return data;
  } catch (e) {
    console.warn("[xp]", e?.message ?? e);
    return "erro";
  }
}

export const curto = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".", ",")} mil` : String(n));

export default function VotosOferta({ ofertaId, likes = 0, dislikes = 0, previa = false }) {
  const [contagem, setContagem] = useState({ likes: Number(likes) || 0, dislikes: Number(dislikes) || 0 });
  const [meu, setMeu] = useState(0); // 1 = like, -1 = deslike, 0 = nenhum
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(""); // "+2 XP" ou "Entre na sua conta para ganhar XP"

  useEffect(() => {
    setMeu(Number(lerVotos()[ofertaId]) || 0);
  }, [ofertaId]);

  async function votar(e, tipo) {
    e.preventDefault();
    e.stopPropagation();
    if (previa || enviando) return;
    const novo = meu === tipo ? 0 : tipo; // clicar de novo tira o voto

    // Atualiza na hora (sem esperar o banco)
    const antes = { contagem, meu };
    setContagem((c) => ({
      likes: c.likes + (novo === 1 ? 1 : 0) - (meu === 1 ? 1 : 0),
      dislikes: c.dislikes + (novo === -1 ? 1 : 0) - (meu === -1 ? 1 : 0),
    }));
    setMeu(novo);

    setEnviando(true);
    const { data, error } = await supabase.rpc("votar_oferta", {
      p_oferta: ofertaId,
      p_voto: novo,
      p_dispositivo: idDoAparelho(),
    });
    setEnviando(false);

    if (error) {
      console.warn("[votos]", error.message);
      setContagem(antes.contagem);
      setMeu(antes.meu);
      return;
    }
    const r = Array.isArray(data) ? data[0] : data;
    if (r) setContagem({ likes: r.likes, dislikes: r.dislikes });
    guardarVoto(ofertaId, novo);
    // XP: só muda quando entra ou sai um like (deslike não mexe no XP)
    if (novo === 1 || meu === 1) {
      const r2 = await registrarLikeNaConta(ofertaId, novo === 1);
      if (novo === 1) {
        setAviso(r2 === "ok" ? "+2 XP" : r2 === "sem_login" ? "Entre na sua conta para ganhar XP" : "");
        setTimeout(() => setAviso(""), 2500);
      }
    }
  }

  const botao = (ativo, cor) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 34,
    padding: "0 10px",
    border: "none",
    borderRadius: 8,
    background: ativo ? `${cor}1a` : "transparent",
    color: ativo ? cor : "#64748b",
    fontSize: 15,
    fontWeight: 800,
    lineHeight: 1,
    cursor: previa ? "default" : "pointer",
    transition: "all .15s",
  });

  return (
    <div
      style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 6, pointerEvents: "auto" }}
      aria-label="Avaliação da oferta"
    >
      <button
        type="button"
        onClick={(e) => votar(e, 1)}
        aria-pressed={meu === 1}
        aria-label={`Gostei (${contagem.likes})`}
        title="Gostei"
        style={botao(meu === 1, "#15803d")}
      >
        <span aria-hidden="true" style={{ fontSize: 20 }}>👍</span> {contagem.likes > 0 && curto(contagem.likes)}
      </button>
      <button
        type="button"
        onClick={(e) => votar(e, -1)}
        aria-pressed={meu === -1}
        aria-label={`Não gostei (${contagem.dislikes})`}
        title="Não gostei"
        style={botao(meu === -1, "#dc2626")}
      >
        <span aria-hidden="true" style={{ fontSize: 20 }}>👎</span> {contagem.dislikes > 0 && curto(contagem.dislikes)}
      </button>
      {aviso && (
        <span
          role="status"
          style={{
            alignSelf: "center",
            fontSize: 12,
            fontWeight: 800,
            color: aviso.startsWith("+") ? "#ff7a1a" : "#64748b",
            whiteSpace: "nowrap",
          }}
        >
          {aviso}
        </span>
      )}
    </div>
  );
}