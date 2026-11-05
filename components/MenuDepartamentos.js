"use client";

// Botão "Departamentos" e o menu no estilo do Promobit.
// Salve como components/MenuDepartamentos.js. Recebe o menu montado por lib/departamentos.js (montarMenu).
//   Computador: abre embaixo do botão; departamentos à esquerda e, ao passar o mouse,
//               as colunas com as subcategorias à direita.
//   Celular:    abre de lado; toca no departamento e aparecem as subcategorias (com "Voltar").

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

const CSS = `
  .mm-fundo { position: fixed; inset: 0; z-index: 70; background: rgba(15, 23, 42, .35); }
  .mm-painel {
    position: fixed; z-index: 71; display: grid; grid-template-columns: 300px minmax(0, 1fr);
    width: min(1100px, calc(100vw - 32px)); max-height: calc(100vh - var(--mm-topo, 120px) - 16px);
    background: #fff; border-radius: 14px; overflow: hidden;
    box-shadow: 0 18px 48px rgba(15, 23, 42, .25); color: #0f172a; font-size: 15px;
  }
  .mm-grupos { list-style: none; margin: 0; padding: 10px; overflow-y: auto; border-right: 1px solid #e5e7eb; }
  .mm-grupo {
    width: 100%; display: flex; align-items: center; gap: 12px; padding: 9px 10px; border: 0; border-radius: 10px;
    background: transparent; font: inherit; color: #334155; text-align: left; cursor: pointer;
  }
  .mm-grupo[aria-current="true"] { background: #f1f5f9; color: #0f172a; font-weight: 600; }
  .mm-grupo:hover { background: #f1f5f9; }
  .mm-icone {
    flex: none; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
    border-radius: 50%; background: #eef2ff; font-size: 16px;
  }
  .mm-grupo-seta { margin-left: auto; color: #94a3b8; display: none; }
  .mm-conteudo { padding: 18px 22px 22px; overflow-y: auto; }
  .mm-topo-grupo { display: none; }
  .mm-colunas { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 18px 26px; align-items: start; }
  .mm-coluna h3 { margin: 0 0 6px; font-size: 16px; line-height: 1.25; color: #334155; font-weight: 800; }
  .mm-coluna h3 a { color: inherit; text-decoration: none; }
  .mm-coluna h3 a:hover { color: #e2640f; }
  .mm-coluna ul { list-style: none; margin: 0; padding: 0; }
  .mm-coluna li a { display: block; padding: 3px 0; color: #64748b; text-decoration: none; line-height: 1.35; }
  .mm-coluna li a:hover, .mm-coluna li a[aria-current="page"] { color: #e2640f; }
  .mm-fechar { display: none; }

  /* Celular e tablet pequeno: painel de lado, uma tela de cada vez */
  @media (max-width: 899px) {
    .mm-painel {
      inset: 0 auto 0 0; width: min(360px, 88vw); max-height: none; height: 100%; border-radius: 0;
      grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr);
    }
    .mm-cabeca { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px;
                 background: #0a4bb8; color: #fff; font-weight: 800; font-size: 17px; }
    .mm-fechar { display: inline-flex; border: 0; background: transparent; color: #fff; font-size: 28px; line-height: 1; cursor: pointer; }
    .mm-grupos { border-right: 0; }
    .mm-grupo-seta { display: inline; }
    .mm-painel[data-vendo="grupo"] .mm-grupos { display: none; }
    .mm-painel[data-vendo="lista"] .mm-conteudo { display: none; }
    .mm-topo-grupo { display: flex; align-items: center; gap: 8px; margin: 0 0 14px; }
    .mm-voltar { border: 0; background: #f1f5f9; border-radius: 8px; padding: 6px 10px; font: inherit; font-weight: 700; cursor: pointer; }
    .mm-colunas { grid-template-columns: 1fr; gap: 16px; }
    .mm-coluna li a { padding: 7px 0; }
  }
  @media (min-width: 900px) { .mm-cabeca { display: none; } .mm-painel { grid-template-rows: minmax(0, 1fr); } }
`;

export default function MenuDepartamentos({ departamentos = [] }) {
  const [aberto, setAberto] = useState(false);
  const [montado, setMontado] = useState(false);
  const [ativo, setAtivo] = useState(departamentos[0]?.id ?? null);
  const [vendo, setVendo] = useState("lista"); // celular: "lista" (departamentos) ou "grupo" (subcategorias)
  const [posicao, setPosicao] = useState({ top: 120, left: 16 });
  const botao = useRef(null);
  const pathname = usePathname();

  useEffect(() => setMontado(true), []);

  // Fecha ao trocar de página
  useEffect(() => setAberto(false), [pathname]);

  // Abre no departamento da página atual (ex.: está em SSD → Informática e Games)
  function abrir() {
    const atual = departamentos.find((d) =>
      d.colunas.some(
        (c) => pathname === `/categoria/${c.slug}` || c.itens.some((i) => pathname === `/categoria/${i.slug}`)
      )
    );
    setAtivo(atual?.id ?? departamentos[0]?.id ?? null);
    setVendo("lista");
    const r = botao.current?.getBoundingClientRect();
    if (!window.matchMedia("(min-width: 900px)").matches) setPosicao(null); // celular: painel de lado
    else if (r) {
      const largura = Math.min(1100, window.innerWidth - 32);
      setPosicao({ top: Math.round(r.bottom + 8), left: Math.max(16, Math.min(r.left, window.innerWidth - largura - 16)) });
    }
    setAberto(true);
  }

  // Esc fecha e a página de trás não rola com o menu aberto
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e) => e.key === "Escape" && setAberto(false);
    const aoRedimensionar = () => setAberto(false);
    document.addEventListener("keydown", aoTeclar);
    window.addEventListener("resize", aoRedimensionar);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      window.removeEventListener("resize", aoRedimensionar);
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  const grupo = departamentos.find((d) => d.id === ativo) ?? departamentos[0];

  const painel = aberto && (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="mm-fundo" onClick={() => setAberto(false)} />
      <nav
        className="mm-painel"
        data-vendo={vendo}
        aria-label="Departamentos"
        style={posicao ? { top: posicao.top, left: posicao.left, "--mm-topo": `${posicao.top}px` } : undefined}
      >
        <div className="mm-cabeca">
          <span>Departamentos</span>
          <button type="button" className="mm-fechar" aria-label="Fechar menu" onClick={() => setAberto(false)}>
            ×
          </button>
        </div>

        <ul className="mm-grupos">
          {departamentos.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                className="mm-grupo"
                aria-current={d.id === grupo?.id}
                onMouseEnter={() => window.matchMedia("(min-width: 900px)").matches && setAtivo(d.id)}
                onFocus={() => setAtivo(d.id)}
                onClick={() => {
                  setAtivo(d.id);
                  setVendo("grupo");
                }}
              >
                <span className="mm-icone" aria-hidden="true">
                  {d.icone}
                </span>
                <span>{d.nome}</span>
                <span className="mm-grupo-seta" aria-hidden="true">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>

        {grupo && (
          <div className="mm-conteudo">
            <div className="mm-topo-grupo">
              <button type="button" className="mm-voltar" onClick={() => setVendo("lista")}>
                ‹ Voltar
              </button>
              <strong>{grupo.nome}</strong>
            </div>

            <div className="mm-colunas">
              {grupo.colunas.map((c) => (
                <div key={c.titulo} className="mm-coluna">
                  <h3>{c.slug ? <Link href={`/categoria/${c.slug}`}>{c.titulo}</Link> : c.titulo}</h3>
                  <ul>
                    {c.itens.map((i) => (
                      <li key={i.slug}>
                        <Link
                          href={`/categoria/${i.slug}`}
                          aria-current={pathname === `/categoria/${i.slug}` ? "page" : undefined}
                        >
                          {i.nome}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

          </div>
        )}
      </nav>
    </>
  );

  return (
    <>
      <button
        ref={botao}
        type="button"
        className="dep-botao"
        aria-expanded={aberto}
        onClick={() => (aberto ? setAberto(false) : abrir())}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </svg>
        <span>Departamentos</span>
      </button>

      {montado && painel && createPortal(painel, document.body)}
    </>
  );
}
