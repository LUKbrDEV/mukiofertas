"use client";

// Botão "O preço subiu ou a oferta acabou?" para a página da oferta.
// Salve como components/BotaoPrecoSubiu.js
// Uso (app/oferta/[id]/page.js, perto do botão "Ir para a oferta"):
//   import BotaoPrecoSubiu from "../../../components/BotaoPrecoSubiu";
//   {!expirada && <BotaoPrecoSubiu ofertaId={oferta.id} />}

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const CSS = `
  .bps { margin: 12px 0 0; text-align: center; }
  .bps button {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; font: inherit; font-size: 0.88rem; font-weight: 700;
    color: #9a3412; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 999px; cursor: pointer;
  }
  .bps button:hover { background: #ffedd5; }
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
          ⚠️ {estado === "enviando" ? "Enviando..." : "O preço subiu ou a oferta acabou?"}
        </button>
      )}
      {mensagem && <p role="status">{mensagem}</p>}
    </div>
  );
}
