"use client";

// Botão "O preço subiu ou a oferta acabou?" para a página da oferta.
// Salve como components/BotaoPrecoSubiu.js
// Uso (app/oferta/[id]/page.js, perto do botão "Ir para a oferta"):
//   import BotaoPrecoSubiu from "../../../components/BotaoPrecoSubiu";
//   {!expirada && <BotaoPrecoSubiu ofertaId={oferta.id} />}

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const CSS = `
  .bps { margin: 0; }
  .bps button {
    display: inline; padding: 0; font: inherit; font-size: 0.84rem; font-weight: 600;
    color: #64748b; background: none; border: 0; cursor: pointer; text-decoration: underline;
    text-underline-offset: 2px;
  }
  .bps button:hover { color: #9a3412; }
  .bps button:disabled { opacity: 0.6; cursor: default; }
  .bps p { margin: 8px 0 0; font-size: 0.85rem; color: #475569; }
`;

const chave = (id) => `muki_aviso_${id}`;

export default function BotaoPrecoSubiu({ ofertaId }) {
  const [estado, setEstado] = useState("pronto"); // pronto | enviando | enviado
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    try {
      if (localStorage.getItem(chave(ofertaId))) {
        setEstado("enviado");
        setMensagem("Você já avisou sobre esta oferta. Obrigado!");
      }
    } catch {}
  }, [ofertaId]);

  async function avisar() {
    if (!confirm("O preço desta oferta subiu ou ela acabou na loja?")) return;
    setEstado("enviando");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      const r = await fetch("/api/oferta/aviso-preco", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ id: ofertaId }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json.erro || "falhou");
      try {
        localStorage.setItem(chave(ofertaId), "1");
      } catch {}
      setEstado("enviado");
      setMensagem(
        json.expirou
          ? "Obrigado! A oferta foi marcada como expirada."
          : "Obrigado pelo aviso! Se outras pessoas confirmarem, a oferta sai do ar."
      );
    } catch {
      setEstado("pronto");
      setMensagem("Não foi possível enviar agora. Tente de novo em instantes.");
    }
  }

  return (
    <div className="bps">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {estado !== "enviado" && (
        <button type="button" onClick={avisar} disabled={estado === "enviando"}>
          {estado === "enviando" ? "Enviando..." : "O preço subiu ou a oferta acabou? Avise aqui"}
        </button>
      )}
      {mensagem && <p role="status">{mensagem}</p>}
    </div>
  );
}
