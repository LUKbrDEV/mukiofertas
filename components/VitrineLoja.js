"use client";

// Vitrine da página de uma loja: no canto superior esquerdo, o campo "Departamento" (só os
// departamentos que a loja tem, com quantas ofertas cada um) e a ordenação; embaixo, TODAS as
// ofertas da loja em grade, carregando mais sozinho ao descer (rota /api/loja).
// O filtro fica no endereço (?depto=games&ordem=menor-preco), dá para compartilhar o link.
// Salve como components/VitrineLoja.js. Usado pelo app/loja/[slug]/page.js.

import { useCallback, useEffect, useRef, useState } from "react";
import CardFeed, { CSS_CARD } from "./CardFeed";

const CSS = `
  .vl { margin: 6px 0 32px; }
  .vl-barra {
    display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px 12px;
    margin: 0 0 14px; padding: 12px; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
  }
  .vl-campo { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .vl-campo--depto { flex: 1 1 260px; max-width: 360px; }
  .vl-campo--ordem { flex: 0 1 200px; }
  .vl-rotulo { font-size: 0.78rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: .04em; }
  .vl-select-caixa { position: relative; }
  .vl-select {
    width: 100%; height: 44px; padding: 0 38px 0 14px; appearance: none; -webkit-appearance: none;
    border: 1.5px solid #cbd5e1; border-radius: 11px; background: #fff; color: #0f172a;
    font: inherit; font-size: 0.98rem; font-weight: 600; cursor: pointer;
  }
  .vl-select:hover { border-color: #94a3b8; }
  .vl-select:focus-visible { outline: 3px solid #93b4f5; outline-offset: 1px; border-color: #1d5bd8; }
  .vl-select[data-ativo="true"] { border-color: #1d5bd8; background: #eaf1fe; color: #1d5bd8; }
  .vl-seta { position: absolute; right: 13px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #475569; }
  .vl-resumo { margin-left: auto; align-self: center; font-size: 0.9rem; color: #475569; white-space: nowrap; }
  .vl-limpar { height: 44px; padding: 0 14px; border: 0; border-radius: 11px; background: #f1f5f9; color: #334155; font: inherit; font-size: 0.9rem; font-weight: 700; cursor: pointer; }
  .vl-limpar:hover { background: #e2e8f0; }

  .vl-grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; }
  .vl-grade > .cf { height: 100%; }
  @media (max-width: 899px) { .vl-grade { grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); } }

  .vl-esqueleto { height: 330px; border-radius: 14px; background: linear-gradient(90deg, #eef1f5 25%, #f7f8fa 50%, #eef1f5 75%); background-size: 200% 100%; animation: vl-brilho 1.2s infinite; }
  @keyframes vl-brilho { to { background-position: -200% 0; } }
  .vl-aviso { padding: 26px; text-align: center; color: #475569; background: #fff; border: 1px dashed #cbd5e1; border-radius: 14px; }
  .vl-aviso button { margin-top: 10px; height: 42px; padding: 0 20px; border: 0; border-radius: 999px; background: #1d5bd8; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
  .vl-fim { padding: 18px; text-align: center; color: #64748b; font-size: 0.9rem; }

  /* Celular: campos lado a lado e compactos; ofertas uma embaixo da outra (card deitado) */
  @media (max-width: 559px) {
    .vl-barra { gap: 8px; padding: 10px; border-radius: 12px; position: sticky; top: var(--mk-topo-fixo, 0px); z-index: 6; box-shadow: 0 4px 10px rgba(15,23,42,.06); }
    .vl-campo--depto { flex: 1 1 0; max-width: none; }
    .vl-campo--ordem { flex: 1 1 0; }
    .vl-rotulo { font-size: 0.68rem; }
    .vl-select { height: 40px; padding: 0 30px 0 10px; font-size: 0.86rem; border-radius: 10px; }
    .vl-seta { right: 9px; }
    .vl-resumo { width: 100%; margin: 0; font-size: 0.8rem; }
    .vl-limpar { display: none; }
    .vl-grade { grid-template-columns: 1fr; gap: 10px; }
    .vl-esqueleto { height: 150px; }
  }
`;

function Seta() {
  return (
    <svg className="vl-seta" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function VitrineLoja({ slug, nomeLoja, departamentos = [], totalLoja = 0, ordens = [], primeira }) {
  const [depto, setDepto] = useState(primeira?.depto ?? null);
  const [ordem, setOrdem] = useState(primeira?.ordem ?? "recentes");
  const [estado, setEstado] = useState({
    ofertas: primeira?.ofertas ?? [],
    pagina: 0,
    temMais: primeira?.temMais ?? false,
    total: primeira?.total ?? 0,
  });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);
  const ocupado = useRef(false);
  const atual = useRef({ depto, ordem });
  const marcador = useRef(null);
  const topo = useRef(null);

  const buscar = useCallback(
    async (d, o, pagina) => {
      const p = new URLSearchParams({ slug, ordem: o, pagina: String(pagina) });
      if (d) p.set("depto", d);
      const r = await fetch(`/api/loja?${p}`);
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    },
    [slug]
  );

  // Troca de departamento ou de ordem: recomeça a lista e guarda o filtro no endereço
  async function trocar(d, o) {
    atual.current = { depto: d, ordem: o };
    setDepto(d);
    setOrdem(o);
    setErro(false);
    const url = new URL(window.location.href);
    if (d) url.searchParams.set("depto", d);
    else url.searchParams.delete("depto");
    if (o && o !== "recentes") url.searchParams.set("ordem", o);
    else url.searchParams.delete("ordem");
    window.history.replaceState(null, "", url);
    const el = topo.current;
    if (el && el.getBoundingClientRect().top < 0) window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 8 });

    setEstado({ ofertas: [], pagina: 0, temMais: false, total: estado.total });
    setCarregando(true);
    ocupado.current = true;
    try {
      const r = await buscar(d, o, 0);
      if (atual.current.depto === d && atual.current.ordem === o)
        setEstado({ ofertas: r.ofertas, pagina: 0, temMais: r.temMais, total: r.total });
    } catch {
      setErro(true);
    } finally {
      ocupado.current = false;
      setCarregando(false);
    }
  }

  const carregarMais = useCallback(async () => {
    if (ocupado.current) return;
    const { depto: d, ordem: o } = atual.current;
    ocupado.current = true;
    setCarregando(true);
    setErro(false);
    try {
      const proxima = estado.pagina + 1;
      const r = await buscar(d, o, proxima);
      if (atual.current.depto === d && atual.current.ordem === o)
        setEstado((e) => ({ ofertas: [...e.ofertas, ...r.ofertas], pagina: proxima, temMais: r.temMais, total: r.total }));
    } catch {
      setErro(true);
    } finally {
      ocupado.current = false;
      setCarregando(false);
    }
  }, [buscar, estado.pagina]);

  useEffect(() => {
    const el = marcador.current;
    if (!el || !estado.temMais || erro || typeof IntersectionObserver === "undefined") return;
    const observador = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && carregarMais(), {
      rootMargin: "1200px 0px",
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, [estado, erro, carregarMais]);

  const escolhido = departamentos.find((d) => d.slug === depto);

  return (
    <section className="vl" ref={topo} aria-label={`Ofertas ${nomeLoja}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS + CSS_CARD }} />

      <div className="vl-barra">
        <label className="vl-campo vl-campo--depto">
          <span className="vl-rotulo">Departamento</span>
          <span className="vl-select-caixa">
            <select
              className="vl-select"
              value={depto ?? ""}
              data-ativo={Boolean(depto)}
              onChange={(e) => trocar(e.target.value || null, ordem)}
            >
              <option value="">Todos ({totalLoja})</option>
              {departamentos.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.emoji} {d.nome} ({d.total})
                </option>
              ))}
            </select>
            <Seta />
          </span>
        </label>

        <label className="vl-campo vl-campo--ordem">
          <span className="vl-rotulo">Ordenar</span>
          <span className="vl-select-caixa">
            <select className="vl-select" value={ordem} onChange={(e) => trocar(depto, e.target.value)}>
              {ordens.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.nome}
                </option>
              ))}
            </select>
            <Seta />
          </span>
        </label>

        {depto && (
          <button type="button" className="vl-limpar" onClick={() => trocar(null, ordem)}>
            Limpar filtro
          </button>
        )}

        <span className="vl-resumo" aria-live="polite">
          {estado.total} {estado.total === 1 ? "oferta" : "ofertas"}
          {escolhido ? ` em ${escolhido.nome}` : ""}
        </span>
      </div>

      {estado.ofertas.length > 0 && (
        <div className="vl-grade">
          {estado.ofertas.map((o) => (
            <CardFeed key={o.id} oferta={o} />
          ))}
        </div>
      )}

      {carregando && (
        <div className="vl-grade" style={{ marginTop: estado.ofertas.length ? 14 : 0 }} aria-label="Carregando ofertas">
          <div className="vl-esqueleto" />
          <div className="vl-esqueleto" />
          <div className="vl-esqueleto" />
        </div>
      )}

      {erro && (
        <div className="vl-aviso">
          Não deu para carregar as ofertas agora.
          <br />
          <button type="button" onClick={() => (estado.ofertas.length ? carregarMais() : trocar(depto, ordem))}>
            Tentar de novo
          </button>
        </div>
      )}

      {!carregando && !erro && estado.ofertas.length === 0 && (
        <p className="vl-aviso">Nenhuma oferta desta loja neste departamento agora.</p>
      )}

      {estado.temMais && <div ref={marcador} aria-hidden="true" style={{ height: 1 }} />}
      {!estado.temMais && estado.ofertas.length > 0 && !carregando && (
        <p className="vl-fim">Você viu todas as {estado.total} ofertas{escolhido ? ` de ${escolhido.nome}` : ""}. 🎉</p>
      )}
    </section>
  );
}
