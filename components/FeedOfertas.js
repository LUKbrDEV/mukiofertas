"use client";

// Feed de ofertas da página inicial: abas de ordenação (Destaques, Recentes, Mais quentes...)
// e botão "Carregar mais". (O filtro por departamento saiu: o menu Departamentos já faz isso.)
// Salve como components/FeedOfertas.js (usado no app/page.js).
//
// Rolagem infinita: ao chegar perto do fim, carrega mais sozinho (o botão continua como reserva).
// Os cards já chegam prontos do servidor (o Google lê todos); aqui só escolhemos quais aparecem.
//
// abas = [{ id, rotulo, descricao, href, itens: [{ id, grupo, card }] }]
//   grupo = slug do departamento da oferta (para o filtro)
// departamentos = { slug: { nome, emoji } }

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const POR_VEZ = 24; // cards por "página" (cerca de 5 linhas no computador)
// Rolagem infinita: quando a pessoa chega perto do fim do feed, mais cards aparecem sozinhos.
// Depois de AUTO_ATE cards, para de carregar sozinho e fica só o botão (para o rodapé continuar alcançável).
const AUTO_ATE = 72;

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

  /* Abas de ordenação: só texto; a ativa fica azul (cor da marca) com um traço embaixo */
  .feed-abas { display: flex; gap: 26px; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid #e2e8f0; }
  .feed-abas::-webkit-scrollbar { display: none; }
  .feed-aba {
    flex: none; position: relative; min-height: 46px; padding: 0 2px;
    border: 0; background: transparent; cursor: pointer;
    font: inherit; font-size: 1rem; font-weight: 500; color: #475569;
    transition: color .15s;
  }
  .feed-aba:hover { color: #0a4bb8; }
  .feed-aba[aria-selected="true"] { color: #0a4bb8; font-weight: 800; }
  .feed-aba[aria-selected="true"]::after {
    content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 3px;
    border-radius: 3px 3px 0 0; background: #0a4bb8;
  }
  .feed-aba:focus-visible { outline: 3px solid #0a4bb8; outline-offset: -3px; border-radius: 6px; }

  .feed-descricao { margin: 12px 0 12px; font-size: 0.88rem; color: #475569; }
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
  const marcador = useRef(null);

  const atual = lista.find((a) => a.id === ativa) ?? lista[0];

  // Quantos cards a aba atual tem com o filtro escolhido
  const totalVisivel = atual
    ? atual.itens.filter((i) => filtro === "todos" || i.grupo === filtro).length
    : 0;
  const temMais = totalVisivel > mostrar;

  // Rolagem infinita: observa um marcador logo abaixo da grade
  useEffect(() => {
    const el = marcador.current;
    if (!el || !temMais || mostrar >= AUTO_ATE || typeof IntersectionObserver === "undefined") return;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) setMostrar((m) => m + POR_VEZ);
      },
      { rootMargin: "600px 0px" } // começa a carregar um pouco antes de chegar no fim
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, [temMais, mostrar, ativa, filtro]);

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

            {eAtual && <div ref={marcador} aria-hidden="true" style={{ height: 1 }} />}

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
