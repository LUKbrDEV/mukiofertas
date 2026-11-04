"use client";

// Feed de ofertas da página inicial: abas de ordenação (Destaques, Recentes, Mais quentes...),
// filtro rápido por departamento e botão "Carregar mais".
// Salve como components/FeedOfertas.js (usado no app/page.js).
//
// Os cards já chegam prontos do servidor (o Google lê todos); aqui só escolhemos quais aparecem.
//
// abas = [{ id, rotulo, descricao, href, itens: [{ id, grupo, card }] }]
//   grupo = slug do departamento da oferta (para o filtro)
// departamentos = { slug: { nome, emoji } }

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

const POR_VEZ = 12; // cards por "página" (3 linhas de 4 no computador)
const MAX_FILTROS = 8; // quantos departamentos aparecem no filtro

const CSS = `
  .feed { margin: 4px 0 32px; }
  .feed-topo {
    position: sticky; top: var(--mk-topo-fixo, 0px); z-index: 5;
    margin: 0 -4px 14px; padding: 10px 4px 0;
    background: var(--fundo, #f4f6fa);
  }
  .feed-titulo {
    display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;
    margin: 0 0 10px; font-family: var(--fonte-titulo), system-ui, sans-serif;
    font-size: 1.4rem; font-weight: 800; color: #0f172a;
  }
  .feed-titulo small { font-family: var(--fonte-texto), system-ui, sans-serif; font-size: 0.88rem; font-weight: 500; color: #475569; }

  /* Abas de ordenação: sublinhado laranja, como uma barra de navegação */
  .feed-abas { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid #e2e8f0; }
  .feed-abas::-webkit-scrollbar { display: none; }
  .feed-aba {
    flex: none; position: relative; min-height: 44px; padding: 0 14px;
    border: 0; background: transparent; cursor: pointer;
    font: inherit; font-size: 0.95rem; font-weight: 700; color: #475569;
  }
  .feed-aba:hover { color: #0f172a; }
  .feed-aba[aria-selected="true"] { color: #0f172a; }
  .feed-aba[aria-selected="true"]::after {
    content: ""; position: absolute; left: 10px; right: 10px; bottom: -1px; height: 3px;
    border-radius: 3px 3px 0 0; background: var(--marca, #ff5a1f);
  }
  .feed-aba:focus-visible { outline: 3px solid var(--marca, #ff5a1f); outline-offset: -3px; border-radius: 8px; }

  /* Filtro por departamento: chips */
  .feed-filtros { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding: 10px 0 10px; }
  .feed-filtros::-webkit-scrollbar { display: none; }
  .feed-chip {
    flex: none; display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 13px;
    border: 1px solid #e2e8f0; border-radius: 999px; background: #fff; cursor: pointer;
    font: inherit; font-size: 0.86rem; font-weight: 600; color: #334155;
  }
  .feed-chip:hover { border-color: #94a3b8; }
  .feed-chip[aria-pressed="true"] { background: #0f172a; border-color: #0f172a; color: #fff; }
  .feed-chip span { font-size: 0.75rem; opacity: .7; }

  .feed-descricao { margin: 0 0 12px; font-size: 0.88rem; color: #475569; }
  .feed-painel[hidden] { display: none; }
  .feed-vazio { padding: 28px; text-align: center; color: #475569; background: #fff; border: 1px dashed #cbd5e1; border-radius: 14px; }
  .feed-rodape { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 18px; }
  .feed-mais, .feed-todas {
    display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 0 24px;
    border-radius: 999px; font: inherit; font-weight: 800; font-size: 0.95rem; cursor: pointer; text-decoration: none;
  }
  .feed-mais { border: 0; background: var(--marca-escura, #d9440e); color: #fff; }
  .feed-mais:hover { background: #b8380b; }
  .feed-todas { border: 1px solid #cbd5e1; background: #fff; color: #0f172a; }
  .feed-todas:hover { border-color: #0f172a; color: #0f172a; }
  @media (max-width: 640px) {
    .feed-titulo { font-size: 1.2rem; }
    .feed-aba { padding: 0 11px; font-size: 0.9rem; }
  }
`;

export default function FeedOfertas({ abas, departamentos = {} }) {
  const lista = (abas ?? []).filter((a) => a && a.itens?.length > 0);
  const [ativa, setAtiva] = useState(lista[0]?.id);
  const [filtro, setFiltro] = useState("todos");
  const [mostrar, setMostrar] = useState(POR_VEZ);
  const botoes = useRef({});

  const atual = lista.find((a) => a.id === ativa) ?? lista[0];

  // Departamentos presentes na aba atual, dos que têm mais ofertas para os que têm menos
  const filtros = useMemo(() => {
    if (!atual) return [];
    const conta = {};
    for (const i of atual.itens) if (i.grupo && departamentos[i.grupo]) conta[i.grupo] = (conta[i.grupo] ?? 0) + 1;
    return Object.entries(conta)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_FILTROS)
      .map(([slug, total]) => ({ slug, total, ...departamentos[slug] }));
  }, [atual, departamentos]);

  if (!atual) return null;

  function trocarAba(id) {
    setAtiva(id);
    setFiltro("todos");
    setMostrar(POR_VEZ);
  }

  function teclado(e, indice) {
    const passo = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const proxima = lista[(indice + passo + lista.length) % lista.length];
    trocarAba(proxima.id);
    botoes.current[proxima.id]?.focus();
  }

  return (
    <section className="feed" aria-labelledby="feed-titulo">
      <style>{CSS}</style>

      <div className="feed-topo">
        <h2 id="feed-titulo" className="feed-titulo">
          Ofertas <small>atualizadas o dia todo</small>
        </h2>

        <div className="feed-abas" role="tablist" aria-label="Ordenar ofertas">
          {lista.map((a, i) => (
            <button
              key={a.id}
              ref={(el) => (botoes.current[a.id] = el)}
              type="button"
              role="tab"
              id={`feed-aba-${a.id}`}
              aria-selected={a.id === atual.id}
              aria-controls={`feed-painel-${a.id}`}
              tabIndex={a.id === atual.id ? 0 : -1}
              className="feed-aba"
              onClick={() => trocarAba(a.id)}
              onKeyDown={(e) => teclado(e, i)}
            >
              {a.rotulo}
            </button>
          ))}
        </div>

        {filtros.length > 1 && (
          <div className="feed-filtros" role="group" aria-label="Filtrar por departamento">
            <button
              type="button"
              className="feed-chip"
              aria-pressed={filtro === "todos"}
              onClick={() => (setFiltro("todos"), setMostrar(POR_VEZ))}
            >
              Todos
            </button>
            {filtros.map((f) => (
              <button
                key={f.slug}
                type="button"
                className="feed-chip"
                aria-pressed={filtro === f.slug}
                onClick={() => (setFiltro(f.slug), setMostrar(POR_VEZ))}
              >
                {f.emoji} {f.nome} <span>{f.total}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {lista.map((a) => {
        const eAtual = a.id === atual.id;
        const visiveis = a.itens.filter((i) => !eAtual || filtro === "todos" || i.grupo === filtro);
        const limite = eAtual ? mostrar : POR_VEZ;
        return (
          <div
            key={a.id}
            role="tabpanel"
            id={`feed-painel-${a.id}`}
            aria-labelledby={`feed-aba-${a.id}`}
            className="feed-painel"
            hidden={!eAtual}
          >
            {a.descricao && <p className="feed-descricao">{a.descricao}</p>}

            {visiveis.length === 0 ? (
              <p className="feed-vazio">Nenhuma oferta deste departamento nesta aba agora.</p>
            ) : (
              <div className="grade-cartoes">
                {a.itens.map((i) => {
                  const posicao = visiveis.indexOf(i);
                  const aparece = posicao !== -1 && posicao < limite;
                  return (
                    <div key={i.id} hidden={!aparece} style={{ display: aparece ? "contents" : "none" }}>
                      {i.card}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="feed-rodape">
              {eAtual && visiveis.length > mostrar && (
                <button type="button" className="feed-mais" onClick={() => setMostrar((m) => m + POR_VEZ)}>
                  Carregar mais ofertas
                </button>
              )}
              {a.href && (
                <Link href={a.href} className="feed-todas">
                  Ver todas →
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
