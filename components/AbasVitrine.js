"use client";

// Seção da página inicial com abas: um título e, embaixo, botões que trocam o conteúdo
// (ex.: Em alta · Relâmpago · Novidades · Cupons). Assim várias faixas cabem em um só bloco
// e a página não fica comprida e poluída.
// Salve como components/AbasVitrine.js (usado no app/page.js).
//
// Todas as abas já vêm prontas do servidor (o Google lê todas); o botão só mostra uma por vez.
//
// Uso:
//   <AbasVitrine id="ofertas-do-dia" titulo="Ofertas do dia" abas={[
//     { id: "em-alta", rotulo: "🔥 Em alta", sub: "texto curto", href: "/mais-procuradas", conteudo: <ListaOfertas ... /> },
//   ]} />

import Link from "next/link";
import { useRef, useState } from "react";

const CSS = `
  .av { margin: 6px 0 30px; }
  .av-topo { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 10px 16px; margin-bottom: 12px; }
  .av-titulo { margin: 0; font-family: var(--fonte-titulo), system-ui, sans-serif; font-size: 1.35rem; font-weight: 800; color: #0f172a; }
  .av-sub { margin: 4px 0 0; font-size: 0.9rem; color: #475569; }
  .av-abas {
    display: flex; gap: 8px; margin: 0 0 16px; padding: 2px 0 4px;
    overflow-x: auto; scrollbar-width: none;
  }
  .av-abas::-webkit-scrollbar { display: none; }
  .av-aba {
    flex: none; display: inline-flex; align-items: center; gap: 6px;
    min-height: 40px; padding: 0 16px;
    border: 1px solid #e2e8f0; border-radius: 999px; background: #fff;
    font: inherit; font-size: 0.92rem; font-weight: 700; color: #334155; cursor: pointer;
    transition: background .15s, color .15s, border-color .15s;
  }
  .av-aba:hover { border-color: #94a3b8; color: #0f172a; }
  .av-aba[aria-selected="true"] { background: #0f172a; border-color: #0f172a; color: #fff; }
  .av-aba:focus-visible { outline: 3px solid var(--marca, #ff5a1f); outline-offset: 2px; }
  .av-num { font-size: 0.75rem; font-weight: 800; padding: 1px 7px; border-radius: 999px; background: #f1f5f9; color: #475569; }
  .av-aba[aria-selected="true"] .av-num { background: rgba(255,255,255,.18); color: #fff; }
  .av-painel[hidden] { display: none; }
  .av-rodape { display: flex; justify-content: center; margin-top: 16px; }
  .av-mais {
    display: inline-flex; align-items: center; min-height: 44px; padding: 0 22px;
    border-radius: 999px; background: var(--marca-escura, #d9440e); color: #fff;
    font-weight: 800; font-size: 0.95rem; text-decoration: none;
  }
  .av-mais:hover { background: #b8380b; color: #fff; }
  @media (max-width: 640px) {
    .av-titulo { font-size: 1.15rem; }
    .av-aba { min-height: 38px; padding: 0 13px; font-size: 0.86rem; }
  }
`;

export default function AbasVitrine({ id, titulo, subtitulo, abas }) {
  const lista = (abas ?? []).filter(Boolean);
  const [ativa, setAtiva] = useState(lista[0]?.id);
  const botoes = useRef({});
  if (lista.length === 0) return null;

  const atual = lista.find((a) => a.id === ativa) ?? lista[0];

  // Setas do teclado trocam de aba (padrão de acessibilidade para abas)
  function teclado(e, indice) {
    const passo = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const proxima = lista[(indice + passo + lista.length) % lista.length];
    setAtiva(proxima.id);
    botoes.current[proxima.id]?.focus();
  }

  return (
    <section className="av" aria-labelledby={`${id}-titulo`}>
      <style>{CSS}</style>

      <div className="av-topo">
        <div>
          <h2 id={`${id}-titulo`} className="av-titulo">
            {titulo}
          </h2>
          <p className="av-sub">{atual.sub ?? subtitulo}</p>
        </div>
      </div>

      <div className="av-abas" role="tablist" aria-label={titulo}>
        {lista.map((a, i) => (
          <button
            key={a.id}
            ref={(el) => (botoes.current[a.id] = el)}
            type="button"
            role="tab"
            id={`${id}-aba-${a.id}`}
            aria-selected={a.id === atual.id}
            aria-controls={`${id}-painel-${a.id}`}
            tabIndex={a.id === atual.id ? 0 : -1}
            className="av-aba"
            onClick={() => setAtiva(a.id)}
            onKeyDown={(e) => teclado(e, i)}
          >
            {a.rotulo}
            {a.total > 0 && <span className="av-num">{a.total}</span>}
          </button>
        ))}
      </div>

      {lista.map((a) => (
        <div
          key={a.id}
          role="tabpanel"
          id={`${id}-painel-${a.id}`}
          aria-labelledby={`${id}-aba-${a.id}`}
          className="av-painel"
          hidden={a.id !== atual.id}
        >
          {a.conteudo}
          {a.href && (
            <div className="av-rodape">
              <Link href={a.href} className="av-mais">
                {a.textoBotao ?? "Ver todas"} →
              </Link>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
