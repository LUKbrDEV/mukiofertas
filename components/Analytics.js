"use client";

// Google Analytics 4: eventos importantes do MukiOfertas.
// Salve como components/Analytics.js (já está no app/layout.js).
//
// Eventos enviados (marque como "Eventos-chave" no GA4 → Administrador → Eventos):
//   clique_oferta   → clicou em "Ir para a loja" (links /ir/123)       parâmetros: oferta_id
//   entrar_grupo    → clicou para entrar no grupo/canal               parâmetros: canal (whatsapp | telegram)
//   copiar_cupom    → copiou um cupom (disparado pelo CupomRevelar)   parâmetros: cupom
//   seguir_rede     → clicou no Instagram/TikTok                      parâmetros: rede

import { useEffect } from "react";

export function evento(nome, parametros = {}) {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      // "beacon": o evento é enviado mesmo quando a página muda logo em seguida (indo para a loja)
      window.gtag("event", nome, { ...parametros, transport_type: "beacon" });
    }
  } catch {}
}

function classificarLink(href) {
  let u;
  try {
    u = new URL(href, window.location.href);
  } catch {
    return null;
  }
  const mesmoSite = u.origin === window.location.origin;
  const oferta = mesmoSite && u.pathname.match(/^\/ir\/([^/?#]+)/);
  if (oferta) return ["clique_oferta", { oferta_id: oferta[1] }];
  if ((mesmoSite && u.pathname === "/grupo") || /chat\.whatsapp\.com|wa\.me/i.test(u.hostname + u.pathname))
    return ["entrar_grupo", { canal: "whatsapp" }];
  if ((mesmoSite && u.pathname === "/telegram") || /^(t\.me|telegram\.me)$/i.test(u.hostname))
    return ["entrar_grupo", { canal: "telegram" }];
  if (/instagram\.com/i.test(u.hostname)) return ["seguir_rede", { rede: "instagram" }];
  if (/tiktok\.com/i.test(u.hostname)) return ["seguir_rede", { rede: "tiktok" }];
  return null;
}

export default function Analytics() {
  useEffect(() => {
    function aoClicar(e) {
      const a = e.target?.closest?.("a[href]");
      if (!a) return;
      const r = classificarLink(a.getAttribute("href"));
      if (r) evento(r[0], r[1]);
    }
    document.addEventListener("click", aoClicar, true);
    return () => document.removeEventListener("click", aoClicar, true);
  }, []);
  return null;
}
