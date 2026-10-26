"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

export default function MenuDepartamentos({ departamentos = [] }) {
  const [aberto, setAberto] = useState(false);
  const [montado, setMontado] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMontado(true), []);

  // Fecha o menu ao trocar de página
  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  // Esc fecha o menu e a página de trás não rola enquanto ele está aberto
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  const menu = (
    <>
      <div className="dep-fundo" data-aberto={aberto} onClick={() => setAberto(false)} />

      <aside
        className="dep-painel"
        data-aberto={aberto}
        role="dialog"
        aria-modal="true"
        aria-label="Departamentos"
      >
        <div className="dep-topo">
          <Image
            src="/logo-cabecalho.png"
            alt=""
            width={40}
            height={40}
            style={{ width: 40, height: 40, borderRadius: "50%", flex: "none" }}
          />
          <span className="dep-topo-titulo">Departamentos</span>
          <button
            type="button"
            className="dep-fechar"
            aria-label="Fechar menu"
            onClick={() => setAberto(false)}
          >
            ×
          </button>
        </div>

        <div className="dep-corpo">
          <Link href="/" className="dep-todas">
            🔥 Ver todas as promoções
          </Link>

          <p className="dep-rotulo">Categorias</p>
          <ul className="dep-lista">
            {departamentos.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/categoria/${d.slug}`}
                  className="dep-item"
                  aria-current={pathname === `/categoria/${d.slug}` ? "page" : undefined}
                >
                  <span className="dep-emoji" aria-hidden="true">
                    {d.emoji}
                  </span>
                  <span className="dep-nome">{d.nome}</span>
                  {d.total > 0 && <span className="dep-total">{d.total}</span>}
                  <span className="dep-seta" aria-hidden="true">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );

  return (
    <>
      <button
        type="button"
        className="dep-botao"
        aria-expanded={aberto}
        onClick={() => setAberto(true)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M4 6h16M4 12h16M4 18h16"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
                <span>Departamentos</span>
      </button>

      {montado && createPortal(menu, document.body)}
    </>
  );
}