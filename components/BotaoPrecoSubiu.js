"use client";

// Botão "O preço subiu ou a oferta acabou?" para a página da oferta.
// Com cupom (prop cupom): "O cupom não funcionou ou acabou?" — com avisos suficientes a oferta expira,
// e as outras ofertas da mesma loja com o mesmo cupom expiram junto (app/api/oferta/aviso-preco).
// compacto = true: só um ícone de bandeira (usado no pé do card, components/CardFeed.js).
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
  .bps--compacto { display: inline-flex; position: relative; }
  .bps--compacto button {
    display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px;
    border-radius: 50%; color: #94a3b8; text-decoration: none;
  }
  .bps--compacto button:hover { background: #fff7ed; color: #c2410c; }
  .bps--compacto button[data-enviado="true"] { color: #c2410c; cursor: default; }
  .bps--compacto p {
    position: absolute; right: -40px; bottom: calc(100% + 6px); z-index: 5; width: 180px; white-space: normal; text-align: left; margin: 0;
    padding: 6px 9px; border-radius: 8px; background: #0f172a; color: #fff; font-size: 0.72rem; font-weight: 600; line-height: 1.3;
  }
`;

const chave = (id) => `muki_aviso_${id}`;

export default function BotaoPrecoSubiu({ ofertaId, cupom = null, compacto = false }) {
  // cupom pode ser o código ("OFFHOJE") ou só um aviso de que a oferta é um cupom ("deste cupom")
  const codigo = typeof cupom === "string" && /^[A-Z0-9_-]{3,30}$/i.test(cupom) ? cupom : null;
  const [estado, setEstado] = useState("pronto"); // pronto | enviando | enviado
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    try {
      if (localStorage.getItem(chave(ofertaId))) {
        setEstado("enviado");
        if (!compacto) setMensagem("Você já avisou sobre esta oferta. Obrigado!");
      }
    } catch {}
  }, [ofertaId, compacto]);

  async function avisar() {
    if (!confirm(codigo ? `O cupom ${codigo} não funcionou ou já acabou?` : cupom ? "O cupom não funcionou ou já acabou?" : "O preço desta oferta subiu ou ela acabou na loja?")) return;
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
          ? json.junto
            ? `Obrigado! A oferta e mais ${json.junto} com o mesmo cupom foram marcadas como expiradas.`
            : "Obrigado! A oferta foi marcada como expirada."
          : "Obrigado pelo aviso! Se outras pessoas confirmarem, a oferta sai do ar."
      );
      if (compacto) setTimeout(() => setMensagem(""), 3500);
    } catch {
      setEstado("pronto");
      setMensagem("Não foi possível enviar agora. Tente de novo em instantes.");
    }
  }

  const pergunta = cupom ? "O cupom não funcionou ou acabou?" : "O preço subiu ou a oferta acabou?";

  if (compacto) {
    return (
      <span className="bps bps--compacto">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <button
          type="button"
          onClick={estado === "pronto" ? avisar : undefined}
          disabled={estado === "enviando"}
          data-enviado={estado === "enviado"}
          aria-label={estado === "enviado" ? "Você já avisou sobre esta oferta" : `${pergunta} Avisar`}
          title={estado === "enviado" ? "Você já avisou" : pergunta}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill={estado === "enviado" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
          </svg>
        </button>
        {mensagem && <p role="status">{mensagem}</p>}
      </span>
    );
  }

  return (
    <div className="bps">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {estado !== "enviado" && (
        <button type="button" onClick={avisar} disabled={estado === "enviando"}>
          {estado === "enviando" ? "Enviando..." : `${pergunta} Avise aqui`}
        </button>
      )}
      {mensagem && <p role="status">{mensagem}</p>}
    </div>
  );
}
