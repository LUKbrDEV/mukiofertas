"use client";

// Coração da Lista de desejos. Sem cor quando a oferta não está salva; vermelho quando está.
// Salve como components/BotaoDesejo.js. Usado no CardOferta (topo do card) e na página do produto.
// Sem login: leva para /entrar e volta para a mesma página depois.

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { alternarDesejo, carregarDesejos, ouvirDesejos } from "../lib/desejos";

const CSS = `
  .bd { display: inline-flex; align-items: center; justify-content: center; gap: 6px; flex: none;
        border: 0; background: transparent; color: #94a3b8; cursor: pointer; font: inherit; line-height: 1;
        transition: color .15s, transform .15s; }
  .bd:hover { color: #e11d48; }
  .bd[aria-pressed="true"] { color: #e11d48; }
  .bd:active svg { transform: scale(.85); }
  .bd svg { transition: transform .15s; }
  .bd--card { width: 30px; height: 30px; margin-left: auto; border-radius: 50%; pointer-events: auto; }
  .bd--card:hover { background: #fff1f2; }
  .bd--pagina { height: 36px; padding: 0 12px; border: 1px solid #e2e8f0; border-radius: 999px; background: #fff;
                color: #334155; font-size: 0.86rem; font-weight: 700; }
  .bd--pagina:hover { border-color: #e11d48; background: #fff1f2; color: #e11d48; }
  .bd--pagina[aria-pressed="true"] { border-color: #fecdd3; background: #fff1f2; color: #e11d48; }
  @media (max-width: 520px) { .bd--pagina span { display: none; } .bd--pagina { width: 36px; padding: 0; } }
  /* Celular: o "há X horas" do card já empurra para a direita; o coração fica logo depois dele */
  @media (max-width: 639px) { .cartao.cv2 .cv2-quando ~ .bd--card { margin-left: 2px; } }
`;

export function IconeCoracao({ cheio = false, tamanho = 18 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true"
      fill={cheio ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.5 12.6 12 20l-7.5-7.4A4.9 4.9 0 0 1 12 6a4.9 4.9 0 0 1 7.5 6.6z" />
    </svg>
  );
}

export default function BotaoDesejo({ ofertaId, variante = "card" }) {
  const [salvo, setSalvo] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const atualizar = (lista) => setSalvo(Boolean(lista?.has(Number(ofertaId))));
    carregarDesejos().then(atualizar);
    return ouvirDesejos(atualizar);
  }, [ofertaId]);

  async function clicar(e) {
    e.preventDefault();
    e.stopPropagation();
    const r = await alternarDesejo(ofertaId);
    if (r === null) router.push(`/entrar?voltar=${encodeURIComponent(pathname)}`);
  }

  const texto = salvo ? "Na lista de desejos" : "Salvar na lista de desejos";
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <button
        type="button"
        className={`bd bd--${variante}`}
        aria-pressed={salvo}
        aria-label={texto}
        title={texto}
        onClick={clicar}
      >
        <IconeCoracao cheio={salvo} tamanho={variante === "card" ? 18 : 16} />
        {variante === "pagina" && <span>{salvo ? "Salvo" : "Salvar"}</span>}
      </button>
    </>
  );
}
