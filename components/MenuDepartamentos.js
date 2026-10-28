"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

// Estilo das subcategorias (ex.: Hardware > SSD)
const CSS = `
  .dep-linha { display: flex; align-items: center; gap: 4px; }
  .dep-linha .dep-item { flex: 1; min-width: 0; }
  .dep-abrir {
    flex: none;
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--tinta-suave, #64748b);
    font-size: 1.1rem;
    cursor: pointer;
    transition: background 0.15s, transform 0.2s;
  }
  .dep-abrir:hover { background: #f1f5f9; color: #0f172a; }
  .dep-abrir[aria-expanded="true"] { transform: rotate(180deg); }
  .dep-sub {
    list-style: none;
    display: grid;
    gap: 2px;
    margin: 2px 0 6px 30px;
    padding-left: 12px;
    border-left: 2px solid #e2e8f0;
  }
  .dep-sub .dep-item { padding: 7px 10px; font-weight: 500; font-size: 0.95rem; }
  .dep-sub .dep-emoji { width: 30px; height: 30px; font-size: 1rem; border-radius: 9px; }
`;

function Item({ d, pathname }) {
  const href = `/categoria/${d.slug}`;
  return (
    <Link href={href} className="dep-item" aria-current={pathname === href ? "page" : undefined}>
      <span className="dep-emoji" aria-hidden="true">
        {d.emoji}
      </span>
      <span className="dep-nome">{d.nome}</span>
      {d.total > 0 && <span className="dep-total">{d.total}</span>}
      {!d.filhos?.length && (
        <span className="dep-seta" aria-hidden="true">
          ›
        </span>
      )}
    </Link>
  );
}

export default function MenuDepartamentos({ departamentos = [] }) {
  const [aberto, setAberto] = useState(false);
  const [montado, setMontado] = useState(false);
  const [expandidos, setExpandidos] = useState({});
  const pathname = usePathname();

  useEffect(() => setMontado(true), []);

  // Fecha o menu ao trocar de página
  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  // Abre sozinho o departamento da página atual (ex.: está em SSD -> Hardware aberto)
  useEffect(() => {
    const atual = departamentos.find(
      (d) => d.filhos?.some((f) => pathname === `/categoria/${f.slug}`) || pathname === `/categoria/${d.slug}`
    );
    if (atual?.filhos?.length) setExpandidos((e) => ({ ...e, [atual.slug]: true }));
  }, [pathname, departamentos]);

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

  const alternar = (slug) => setExpandidos((e) => ({ ...e, [slug]: !e[slug] }));

  const menu = (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
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
          <p className="dep-rotulo">Categorias</p>
          <ul className="dep-lista">
            {departamentos.map((d) => {
              const temFilhos = d.filhos?.length > 0;
              const expandido = Boolean(expandidos[d.slug]);
              return (
                <li key={d.slug}>
                  {temFilhos ? (
                    <>
                      <div className="dep-linha">
                        <Item d={d} pathname={pathname} />
                        <button
                          type="button"
                          className="dep-abrir"
                          aria-expanded={expandido}
                          aria-controls={`dep-sub-${d.slug}`}
                          aria-label={`${expandido ? "Fechar" : "Abrir"} subcategorias de ${d.nome}`}
                          onClick={() => alternar(d.slug)}
                        >
                          ▾
                        </button>
                      </div>
                      {expandido && (
                        <ul className="dep-sub" id={`dep-sub-${d.slug}`}>
                          {d.filhos.map((f) => (
                            <li key={f.slug}>
                              <Item d={f} pathname={pathname} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Item d={d} pathname={pathname} />
                  )}
                </li>
              );
            })}
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