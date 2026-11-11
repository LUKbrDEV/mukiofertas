"use client";

// Botão "UP" (setinha para cima) do card: a galera avisa que a oferta é boa.
// Cada UP é um like no banco (função votar_oferta, a mesma dos 👍), dá +2 XP para quem está logado
// (registrar_like_xp) e faz a oferta SUBIR nos Destaques (lib/vitrine.mjs soma os UPs na pontuação).
// Clicar de novo tira o UP. Quanto mais UPs, mais "quente" fica a cor: cinza → laranja (5+) → vermelho (20+).
// Salve como components/BotaoUp.js. Usado no components/CardFeed.js.

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { lerVotos, guardarVoto, idDoAparelho, registrarLikeNaConta, curto } from "./VotosOferta";

// Estilos do botão: app/card-novo.css (classe .up)

const nivel = (n) => (n >= 20 ? "quente" : n >= 5 ? "morno" : "frio");

export default function BotaoUp({ ofertaId, ups = 0, previa = false, className = "" }) {
  const [total, setTotal] = useState(Number(ups) || 0);
  const [meu, setMeu] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [subiu, setSubiu] = useState(false);

  useEffect(() => setMeu(Number(lerVotos()[ofertaId]) === 1), [ofertaId]);

  async function clicar(e) {
    e.preventDefault();
    e.stopPropagation();
    if (previa || enviando) return;
    const votoAntes = Number(lerVotos()[ofertaId]) || 0; // pode ter sido um 👎 na página da oferta
    const novo = meu ? 0 : 1;
    const antes = { total, meu };
    setTotal((t) => t + (novo ? 1 : -1));
    setMeu(Boolean(novo));
    if (novo) {
      setSubiu(true);
      setTimeout(() => setSubiu(false), 500);
    }

    setEnviando(true);
    const { data, error } = await supabase.rpc("votar_oferta", {
      p_oferta: ofertaId,
      p_voto: novo,
      p_dispositivo: idDoAparelho(),
    });
    setEnviando(false);
    if (error) {
      console.warn("[up]", error.message);
      setTotal(antes.total);
      setMeu(antes.meu);
      return;
    }
    const r = Array.isArray(data) ? data[0] : data;
    if (r && Number.isFinite(Number(r.likes))) setTotal(Number(r.likes));
    guardarVoto(ofertaId, novo);
    if (novo === 1 || votoAntes === 1) {
      const xp = await registrarLikeNaConta(ofertaId, novo === 1);
      if (novo === 1) {
        setAviso(xp === "ok" ? "+2 XP" : xp === "sem_login" ? "Entre para ganhar XP" : "Valeu pelo UP!");
        setTimeout(() => setAviso(""), 2200);
      }
    }
  }

  return (
    <button
      type="button"
      className={`up${subiu ? " up--subiu" : ""}${className ? ` ${className}` : ""}`}
      data-nivel={nivel(total)}
      aria-pressed={meu}
      aria-label={meu ? `Você deu UP nesta oferta (${total}). Clique para tirar` : `Dar UP: avisar que é uma boa oferta (${total})`}
      title={meu ? "Você deu UP (clique para tirar)" : "Boa oferta? Dê um UP!"}
      onClick={clicar}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      {total > 0 ? curto(total) : "UP"}
      {aviso && (
        <span className="up-aviso" role="status">
          {aviso}
        </span>
      )}
    </button>
  );
}
