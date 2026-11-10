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

// Ícones dos departamentos: traço simples, todos na mesma cor (azul do site), como nos grandes sites de ofertas.
// A chave é o "id" do departamento em data/menu-departamentos.js. Sem ícone aqui, aparece o emoji do "icone".
const P = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
const ICONES = {
  natal: (
    <g {...P}>
      <path d="M12 3l5 6h-3l4 5h-3l4 5H5l4-5H6l4-5H7l5-6z" />
      <path d="M12 19v2.5" />
    </g>
  ),
  eletronicos: (
    <g {...P}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
      <path d="M11 18.5h2" />
    </g>
  ),
  informatica: (
    <g {...P}>
      <path d="M7.5 7h9a4.5 4.5 0 0 1 4.4 5.4l-.9 4.4a2.4 2.4 0 0 1-4.2 1l-1.8-2.3h-4l-1.8 2.3a2.4 2.4 0 0 1-4.2-1l-.9-4.4A4.5 4.5 0 0 1 7.5 7z" />
      <path d="M8 10.5v3M6.5 12h3" />
      <path d="M15.5 11h.01M17.5 13h.01" />
    </g>
  ),
  casa: (
    <g {...P}>
      <rect x="6" y="2.5" width="12" height="19" rx="2" />
      <path d="M6 9.5h12M9 5.5v1.5M9 12.5v3" />
    </g>
  ),
  moda: (
    <g {...P}>
      <path d="M9 3.5 4 6l-1.5 4.5 3 1.2L6.5 10v10.5h11V10l1 1.7 3-1.2L20 6l-5-2.5a3 3 0 0 1-6 0z" />
    </g>
  ),
  bebes: (
    <g {...P}>
      <path d="M4 5h2l1.2 3" />
      <path d="M7.2 8H20a6.5 6.5 0 0 1-6.5 6.5h-1.8A4.5 4.5 0 0 1 7.2 8z" />
      <path d="M20 8a6.5 6.5 0 0 0-6.5-6.5V8" />
      <circle cx="9" cy="19" r="1.8" />
      <circle cx="17" cy="19" r="1.8" />
    </g>
  ),
  beleza: (
    <g {...P}>
      <path d="M12 20.5s-8-4.6-8-10.4A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 8 2.5c0 5.8-8 10.4-8 10.4z" />
    </g>
  ),
  esporte: (
    <g {...P}>
      <path d="M6.5 6.5l11 11" />
      <path d="M3.5 9.5l6-6M5 11l6-6M13 19l6-6M14.5 20.5l6-6" />
    </g>
  ),
  mercado: (
    <g {...P}>
      <path d="M2.5 3.5h2.6l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 7.5H6" />
      <circle cx="9.5" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
    </g>
  ),
  livros: (
    <g {...P}>
      <path d="M12 6.5C10 4.8 6.8 4.3 3 4.8v13.5c3.8-.5 7 0 9 1.7 2-1.7 5.2-2.2 9-1.7V4.8c-3.8-.5-7 0-9 1.7z" />
      <path d="M12 6.5V20" />
    </g>
  ),
  ferramentas: (
    <g {...P}>
      <path d="M14.7 6.3a4 4 0 0 0 5 5L21 10a5 5 0 0 1-6.6 6.6L8 23l-3-3 6.4-6.4A5 5 0 0 1 18 7z" transform="translate(-1.5 -2)" />
    </g>
  ),
};

function IconeDepartamento({ id, emoji }) {
  const desenho = ICONES[id];
  if (!desenho) return emoji;
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      {desenho}
    </svg>
  );
}

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
    border-radius: 50%; background: #eef4ff; color: #0a4bb8; font-size: 16px;
  }
  .mm-grupo[aria-current="true"] .mm-icone, .mm-grupo:hover .mm-icone { background: #dbe8ff; }
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
                  <IconeDepartamento id={d.id} emoji={d.icone} />
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
                  <h3>{c.href || c.slug ? <Link href={c.href ?? `/categoria/${c.slug}`}>{c.titulo}</Link> : c.titulo}</h3>
                  <ul>
                    {c.itens.map((i) => (
                      <li key={i.href ?? i.slug}>
                        <Link
                          href={i.href ?? `/categoria/${i.slug}`}
                          aria-current={!i.href && pathname === `/categoria/${i.slug}` ? "page" : undefined}
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
