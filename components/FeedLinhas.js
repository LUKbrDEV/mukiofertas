"use client";

// Feed da página inicial (visual do Home_desktop):
//   - abas: Meus alertas (link) · Destaques · Recentes (com o número de novas) · Menor preço · Maior desconto · Com cupom
//     e o botão de filtro à direita; embaixo, os departamentos (Todas, Hardware, Celulares... e "Mais")
//   - COMPUTADOR: grade de 4 ofertas por linha; depois de 2 linhas entra a faixa "Receba as relâmpago antes de
//     todo mundo" (Telegram e WhatsApp); carrega mais sozinho ao descer e tem o botão "Carregar mais ofertas"
//   - CELULAR: linhas por categoria (1 card na tela, arrasta para o lado para ver mais da mesma categoria)
//   - rolagem infinita pela rota /api/feed (modo=grade no computador)
// Salve como components/FeedLinhas.js. Usado pelo app/page.js (a primeira página das duas versões já vem do servidor).

import { useCallback, useEffect, useRef, useState } from "react";
import CardFeed, { CSS_CARD } from "./CardFeed";

const NO_PC = "(min-width: 900px)";
const DEPTOS_VISIVEIS = 6; // no computador, os outros departamentos ficam no botão "Mais"
const FAIXA_DEPOIS_DE = 8; // computador: a faixa dos canais entra depois de 2 linhas (8 cards)
const FAIXA_DEPOIS_DA_LINHA = 3; // celular: depois da 3ª linha

const CSS = `
  .fd { margin: 0 0 32px; }
  .fd-so-pc { display: none !important; }
  @media (min-width: 900px) {
    .fd-so-pc { display: block !important; }
    .fd-aba.fd-so-pc, .fd-chip.fd-so-pc { display: inline-flex !important; }
    .fd-so-cel { display: none !important; }
  }

  /* Abas e filtros (no computador ficam presos no topo ao rolar) */
  .fd-topo {
    position: relative; z-index: 6; margin: 0 0 14px; padding: 0 12px;
    background: #fff; border: 1px solid #e6e9ef; border-radius: 16px;
  }
  @media (min-width: 900px) { .fd-topo { position: sticky; top: var(--mk-topo-fixo, 0px); padding: 0 14px; box-shadow: 0 2px 10px rgba(15,23,42,.04); } }
  .fd-abas-linha { display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #eef1f5; }
  .fd-abas { display: flex; align-items: center; gap: 4px; flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: none; padding: 10px 0; }
  .fd-abas::-webkit-scrollbar, .fd-chips::-webkit-scrollbar { display: none; }
  .fd-aba {
    flex: none; display: inline-flex; align-items: center; gap: 7px; height: 40px; padding: 0 13px;
    border: 0; border-radius: 10px; background: transparent; cursor: pointer; text-decoration: none;
    font: inherit; font-size: 0.92rem; font-weight: 600; color: #334155; white-space: nowrap;
  }
  .fd-aba:hover { background: #f1f5f9; color: #0f172a; }
  .fd-aba[aria-selected="true"] { background: #1d5bd8; color: #fff; }
  .fd-aba:focus-visible { outline: 3px solid #93b4f5; outline-offset: 2px; }
  .fd-aba svg { flex: none; }
  .fd-contador {
    display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 20px; padding: 0 6px;
    border-radius: 999px; background: #d9440e; color: #fff; font-size: 0.72rem; font-weight: 800;
  }
  .fd-aba[aria-selected="true"] .fd-contador { background: #fff; color: #1d5bd8; }
  .fd-filtro-botao {
    flex: none; display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px;
    border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; color: #334155; cursor: pointer;
  }
  .fd-filtro-botao:hover, .fd-filtro-botao[aria-expanded="true"] { border-color: #1d5bd8; color: #1d5bd8; background: #eaf1fe; }

  .fd-chips-caixa { position: relative; }
  .fd-chips-seta {
    position: absolute; right: 0; top: 50%; transform: translateY(-50%); z-index: 2;
    display: inline-flex; align-items: center; justify-content: flex-end;
    width: 52px; height: 34px; padding: 0; border: 0; cursor: pointer; color: #1d5bd8;
    background: linear-gradient(90deg, rgba(255,255,255,0), #fff 55%);
  }
  .fd-chips-seta span {
    display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%;
    background: #fff; border: 1px solid #e2e8f0; box-shadow: 0 2px 6px rgba(15,23,42,.12);
  }
  .fd-chips-seta:hover span { border-color: #1d5bd8; }
  .fd-chips-seta--esq { right: auto; left: 0; justify-content: flex-start; background: linear-gradient(270deg, rgba(255,255,255,0), #fff 55%); }
  .fd-chips { display: flex; align-items: center; gap: 8px; overflow-x: auto; scrollbar-width: none; padding: 10px 0; }
  .fd-chips[data-aberto="true"] { flex-wrap: wrap; overflow: visible; }
  .fd-chip {
    flex: none; display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px;
    border: 1px solid #e2e8f0; border-radius: 999px; background: #fff; cursor: pointer;
    font: inherit; font-size: 0.86rem; font-weight: 500; color: #334155; white-space: nowrap;
  }
  .fd-chip:hover { border-color: #94a3b8; }
  .fd-chip[aria-pressed="true"] { border-color: #1d5bd8; background: #eaf1fe; color: #1d5bd8; font-weight: 700; }
  @media (min-width: 900px) { .fd-chips:not([data-aberto="true"]) .fd-chip--extra:not([aria-pressed="true"]) { display: none; } }

  /* Computador: grade */
  .fd-grade { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
  .fd-grade > .cf { height: 100%; }
  .fd-mais { display: flex; justify-content: center; margin-top: 18px; }
  .fd-mais button {
    height: 44px; padding: 0 26px; border: 1.5px solid #1d5bd8; border-radius: 10px; background: #fff; color: #1d5bd8;
    font: inherit; font-size: 0.92rem; font-weight: 700; cursor: pointer;
  }
  .fd-mais button:hover { background: #eaf1fe; }

  /* Faixa "Receba as relâmpago antes de todo mundo" */
  .fd-canais {
    grid-column: 1 / -1; display: flex; align-items: center; gap: 16px; padding: 18px 22px; border-radius: 16px;
    background: linear-gradient(120deg, #1d5bd8, #1749b4); color: #fff;
  }
  .fd-canais img { flex: none; width: 54px; height: 54px; border-radius: 50%; background: #fff; }
  .fd-canais-texto { flex: 1; min-width: 0; }
  .fd-canais strong { display: block; font-size: 1.12rem; font-weight: 800; }
  .fd-canais span { font-size: 0.86rem; opacity: .9; }
  .fd-canais-botoes { display: flex; gap: 10px; flex: none; }
  .fd-canal { display: inline-flex; align-items: center; gap: 7px; height: 42px; padding: 0 18px; border-radius: 10px; font-weight: 700; font-size: 0.9rem; text-decoration: none; }
  .fd-canal--telegram { background: #fff; color: #1d5bd8; }
  .fd-canal--whatsapp { background: #ff7a1a; color: #fff; }
  .fd-canal:hover { filter: brightness(.95); }
  @media (max-width: 899px) {
    .fd-canais { flex-wrap: wrap; gap: 10px 12px; padding: 14px; margin: 0 0 16px; }
    .fd-canais img { width: 42px; height: 42px; }
    .fd-canais strong { font-size: 0.98rem; }
    .fd-canais span { font-size: 0.8rem; }
    .fd-canais-botoes { width: 100%; }
    .fd-canal { flex: 1; justify-content: center; height: 38px; font-size: 0.86rem; }
  }

  /* Celular: linhas por categoria */
  .fd-linha { margin: 0 0 14px; }
  .fd-linha-topo { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; }
  .fd-linha-titulo { margin: 0; font-size: 0.92rem; font-weight: 800; color: #0f172a; }
  .fd-posicao { padding: 1px 7px; border-radius: 999px; background: #e8eefb; color: #1d5bd8; font-size: 0.7rem; font-weight: 800; }
  .fd-linha-ver { margin-left: auto; font-size: 0.82rem; font-weight: 700; color: #1d5bd8; text-decoration: none; white-space: nowrap; }
  .fd-trilho { display: flex; gap: 10px; overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x mandatory; scrollbar-width: none; padding: 2px 2px 6px; }
  .fd-trilho::-webkit-scrollbar { display: none; }
  .fd-item { flex: 0 0 90%; min-width: 0; scroll-snap-align: start; display: flex; }
  .fd-item:only-child { flex-basis: 100%; }
  @media (min-width: 560px) { .fd-item { flex-basis: calc((100% - 10px) / 2.1); } }

  /* Celular: abas e filtros mais compactos */
  @media (max-width: 559px) {
    .fd-topo { padding: 0 8px; border-radius: 14px; margin-bottom: 10px; }
    .fd-abas { gap: 2px; padding: 6px 0; }
    .fd-aba { height: 36px; padding: 0 11px; gap: 6px; font-size: 0.86rem; }
    .fd-aba svg { width: 15px; height: 15px; }
    .fd-filtro-botao { width: 34px; height: 34px; }
    .fd-chips { gap: 6px; padding: 8px 0; }
    .fd-chip { height: 32px; padding: 0 12px; font-size: 0.84rem; }
  }

  .fd-esqueletos { display: grid; gap: 14px; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 14px; }
  .fd-esqueleto { height: 380px; border-radius: 16px; background: linear-gradient(90deg, #eef1f5 25%, #f7f8fa 50%, #eef1f5 75%); background-size: 200% 100%; animation: fd-brilho 1.2s infinite; }
  @media (max-width: 899px) { .fd-esqueletos { grid-template-columns: 1fr; } .fd-esqueleto { height: 150px; } .fd-esqueleto:nth-child(n+3) { display: none; } }
  @keyframes fd-brilho { to { background-position: -200% 0; } }
  .fd-aviso { padding: 26px; text-align: center; color: #475569; background: #fff; border: 1px dashed #cbd5e1; border-radius: 16px; }
  .fd-aviso button { margin-top: 10px; height: 42px; padding: 0 20px; border: 0; border-radius: 999px; background: #1d5bd8; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
  .fd-fim { padding: 18px; text-align: center; color: #64748b; font-size: 0.9rem; }
`;

// ---------- Ícones das abas ----------
const ICONES = {
  estrela: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  relogio: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  queda: <path d="M3 7l6 6 4-4 8 8M15 17h6v-6" />,
  porcento: (
    <>
      <path d="M19 5 5 19" />
      <circle cx="7" cy="7" r="2.2" />
      <circle cx="17" cy="17" r="2.2" />
    </>
  ),
  cupom: <path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z" />,
  sino: <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" />,
};
function Icone({ nome, tamanho = 17 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {ICONES[nome]}
    </svg>
  );
}
function IconeFiltro() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

// Faixa dos canais (Telegram e WhatsApp) no meio das ofertas
function FaixaCanais() {
  return (
    <aside className="fd-canais" aria-label="Receba as ofertas relâmpago">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-cabecalho.png" alt="" />
      <div className="fd-canais-texto">
        <strong>Receba as relâmpago antes de todo mundo</strong>
        <span>As melhores ofertas chegam primeiro no nosso canal e no grupo.</span>
      </div>
      <div className="fd-canais-botoes">
        <a className="fd-canal fd-canal--telegram" href="/telegram" target="_blank" rel="noopener noreferrer">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M21 4 3 11l6 2 2 6 3-4 5 4z" /></svg>
          Telegram
        </a>
        <a className="fd-canal fd-canal--whatsapp" href="/grupo" target="_blank" rel="noopener noreferrer">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" /></svg>
          WhatsApp
        </a>
      </div>
    </aside>
  );
}

// Celular: uma linha da categoria, arrastando para o lado
function Linha({ linha }) {
  const trilho = useRef(null);
  const [posicao, setPosicao] = useState(1);
  const total = linha.ofertas.length;

  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    const atualizar = () => {
      const f = el.children;
      const passo = f.length > 1 ? f[1].offsetLeft - f[0].offsetLeft : el.clientWidth;
      setPosicao(Math.min(total, Math.round(el.scrollLeft / Math.max(1, passo)) + 1));
    };
    el.addEventListener("scroll", atualizar, { passive: true });
    return () => el.removeEventListener("scroll", atualizar);
  }, [total]);

  return (
    <section className="fd-linha" aria-label={linha.titulo}>
      <div className="fd-linha-topo">
        <h3 className="fd-linha-titulo">
          <span aria-hidden="true">{linha.emoji}</span> {linha.titulo}
        </h3>
        {total > 1 && (
          <span className="fd-posicao" aria-hidden="true">
            {posicao}/{total}
          </span>
        )}
        {linha.href && (
          <a className="fd-linha-ver" href={linha.href}>
            Ver tudo →
          </a>
        )}
      </div>
      <div className="fd-trilho" ref={trilho}>
        {linha.ofertas.map((o) => (
          <div className="fd-item" key={o.id}>
            <CardFeed oferta={o} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ListaCelular({ linhas }) {
  return linhas.map((l, i) => (
    <div key={l.chave}>
      <Linha linha={l} />
      {i === FAIXA_DEPOIS_DA_LINHA - 1 && <FaixaCanais />}
    </div>
  ));
}

function GradePc({ ofertas }) {
  return (
    <div className="fd-grade">
      {ofertas.map((o, i) => (
        <FragmentoComFaixa key={o.id} faixa={i === FAIXA_DEPOIS_DE}>
          <CardFeed oferta={o} />
        </FragmentoComFaixa>
      ))}
    </div>
  );
}
function FragmentoComFaixa({ faixa, children }) {
  return (
    <>
      {faixa && <FaixaCanais />}
      {children}
    </>
  );
}

const vazio = () => ({ itens: [], pagina: 0, temMais: false });

export default function FeedLinhas({ abas = [], departamentos = [], primeira, primeiraGrade }) {
  const abaInicial = primeira?.aba ?? abas[0]?.id ?? "destaques";
  const [modo, setModo] = useState(null); // null até descobrir a tela (o servidor manda as duas versões)
  const [aba, setAba] = useState(abaInicial);
  const [depto, setDepto] = useState(null);
  const [estados, setEstados] = useState({
    cel: { itens: primeira?.linhas ?? [], pagina: 0, temMais: Boolean(primeira?.temMais) },
    pc: { itens: primeiraGrade?.ofertas ?? [], pagina: 0, temMais: Boolean(primeiraGrade?.temMais) },
  });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [chipsAvancar, setChipsAvancar] = useState(false); // ainda tem departamentos escondidos à direita?
  const [chipsVoltar, setChipsVoltar] = useState(false); // já rolou (tem departamentos escondidos à esquerda)?
  const chips = useRef(null);

  const guardados = useRef(new Map()); // "modo|aba|depto" -> estado (voltar para uma aba é instantâneo)
  const ocupado = useRef(false);
  const atual = useRef({ aba: abaInicial, depto: null });
  const marcador = useRef(null);
  const topo = useRef(null);
  const botoes = useRef({});
  const chave = (m, a, d) => `${m}|${a}|${d ?? ""}`;

  if (!guardados.current.size) {
    guardados.current.set(chave("cel", abaInicial, null), estados.cel);
    guardados.current.set(chave("pc", abaInicial, null), estados.pc);
  }

  // Setinhas dos departamentos: a da direita aparece enquanto houver botões escondidos à direita;
  // a da esquerda, depois que a pessoa rolou (para voltar)
  useEffect(() => {
    const el = chips.current;
    if (!el) return;
    const ver = () => {
      setChipsAvancar(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
      setChipsVoltar(el.scrollLeft > 4);
    };
    ver();
    el.addEventListener("scroll", ver, { passive: true });
    window.addEventListener("resize", ver);
    return () => {
      el.removeEventListener("scroll", ver);
      window.removeEventListener("resize", ver);
    };
  }, [aberto, modo]);

  // Descobre se é computador ou celular (e acompanha se a janela mudar de tamanho)
  useEffect(() => {
    const mq = window.matchMedia(NO_PC);
    const ver = () => setModo(mq.matches ? "pc" : "cel");
    ver();
    mq.addEventListener("change", ver);
    return () => mq.removeEventListener("change", ver);
  }, []);

  const buscar = useCallback(async (m, a, d, pagina) => {
    const p = new URLSearchParams({ aba: a, pagina: String(pagina) });
    if (m === "pc") p.set("modo", "grade");
    if (d) p.set("depto", d);
    const r = await fetch(`/api/feed?${p}`);
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    return { itens: m === "pc" ? j.ofertas : j.linhas, temMais: j.temMais };
  }, []);

  // Carrega a página "pagina" do modo/aba/departamento e junta com o que já tinha
  const carregar = useCallback(
    async (m, a, d, pagina) => {
      if (ocupado.current) return;
      ocupado.current = true;
      setCarregando(true);
      setErro(false);
      try {
        const r = await buscar(m, a, d, pagina);
        const antes = guardados.current.get(chave(m, a, d));
        const novo = {
          itens: pagina === 0 ? r.itens : [...(antes?.itens ?? []), ...r.itens],
          pagina,
          temMais: r.temMais,
        };
        guardados.current.set(chave(m, a, d), novo);
        if (atual.current.aba === a && atual.current.depto === d) setEstados((e) => ({ ...e, [m]: novo }));
      } catch {
        setErro(true);
      } finally {
        ocupado.current = false;
        setCarregando(false);
      }
    },
    [buscar]
  );

  function trocar(a, d) {
    atual.current = { aba: a, depto: d };
    setAba(a);
    setDepto(d);
    setErro(false);
    const el = topo.current;
    if (el && el.getBoundingClientRect().top < 0) {
      window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 8, behavior: "smooth" });
    }
    const m = modo ?? "cel";
    const outro = m === "pc" ? "cel" : "pc";
    const salvo = guardados.current.get(chave(m, a, d));
    setEstados({ [m]: salvo ?? vazio(), [outro]: guardados.current.get(chave(outro, a, d)) ?? null });
    if (!salvo) {
      ocupado.current = false;
      carregar(m, a, d, 0);
    }
  }

  // A tela mudou de tamanho (ex.: virou o celular) e a outra versão ainda não foi carregada
  useEffect(() => {
    if (modo && estados[modo] === null) {
      const { aba: a, depto: d } = atual.current;
      setEstados((e) => ({ ...e, [modo]: guardados.current.get(chave(modo, a, d)) ?? vazio() }));
      if (!guardados.current.get(chave(modo, a, d))) carregar(modo, a, d, 0);
    }
  }, [modo, estados, carregar]);

  const ativo = modo ? estados[modo] : null;

  const carregarMais = useCallback(() => {
    if (!modo || !ativo?.temMais) return;
    const { aba: a, depto: d } = atual.current;
    carregar(modo, a, d, ativo.pagina + 1);
  }, [modo, ativo, carregar]);

  // Rolagem infinita: quando o marcador chega perto da tela, carrega mais
  useEffect(() => {
    const el = marcador.current;
    if (!el || !ativo?.temMais || erro || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && carregarMais(), { rootMargin: "1200px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ativo, erro, carregarMais]);

  function teclado(e, i) {
    const passo = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const proxima = abas[(i + passo + abas.length) % abas.length];
    trocar(proxima.id, depto);
    botoes.current[proxima.id]?.focus();
  }

  const descricao = abas.find((a) => a.id === aba)?.descricao;
  const temExtras = departamentos.length > DEPTOS_VISIVEIS;

  return (
    <section className="fd" aria-label="Ofertas" ref={topo}>
      <style dangerouslySetInnerHTML={{ __html: CSS + CSS_CARD }} />

      <div className="fd-topo">
        <div className="fd-abas-linha">
          <div className="fd-abas" role="tablist" aria-label="Ordenar ofertas">
            <a className="fd-aba fd-so-pc" href="/alertas">
              <Icone nome="sino" /> Meus alertas
            </a>
            {abas.map((a, i) => (
              <button
                key={a.id}
                ref={(el) => (botoes.current[a.id] = el)}
                type="button"
                role="tab"
                aria-selected={a.id === aba}
                aria-controls="fd-lista"
                tabIndex={a.id === aba ? 0 : -1}
                className="fd-aba"
                title={a.descricao}
                onClick={() => trocar(a.id, depto)}
                onKeyDown={(e) => teclado(e, i)}
              >
                {a.icone && <Icone nome={a.icone} />}
                {a.rotulo}
                {a.contador ? <span className="fd-contador">{a.contador > 99 ? "99+" : a.contador}</span> : null}
              </button>
            ))}
          </div>
          {departamentos.length > 0 && (
            <button
              type="button"
              className="fd-filtro-botao"
              aria-expanded={aberto}
              aria-label={aberto ? "Mostrar menos departamentos" : "Mostrar todos os departamentos"}
              title="Filtrar por departamento"
              onClick={() => setAberto((v) => !v)}
            >
              <IconeFiltro />
            </button>
          )}
        </div>

        {departamentos.length > 0 && (
          <div className="fd-chips-caixa">
          {chipsVoltar && !aberto && (
            <button
              type="button"
              className="fd-chips-seta fd-chips-seta--esq"
              aria-label="Voltar aos departamentos anteriores"
              onClick={() => chips.current?.scrollBy({ left: -chips.current.clientWidth * 0.7, behavior: "smooth" })}
            >
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 6-6 6 6 6" />
                </svg>
              </span>
            </button>
          )}
          <div className="fd-chips" ref={chips} data-aberto={aberto} role="group" aria-label="Filtrar por departamento">
            <button type="button" className="fd-chip" aria-pressed={!depto} onClick={() => trocar(aba, null)}>
              Todas
            </button>
            {departamentos.map((d, i) => (
              <button
                key={d.slug}
                type="button"
                className={i >= DEPTOS_VISIVEIS ? "fd-chip fd-chip--extra" : "fd-chip"}
                aria-pressed={depto === d.slug}
                onClick={() => {
                  trocar(aba, depto === d.slug ? null : d.slug);
                  setAberto(false);
                }}
              >
                {d.nome}
              </button>
            ))}
            {temExtras && !aberto && (
              <button type="button" className="fd-chip fd-so-pc" onClick={() => setAberto(true)}>
                Mais
              </button>
            )}
          </div>
          {chipsAvancar && !aberto && (
            <button
              type="button"
              className="fd-chips-seta"
              aria-label="Ver mais departamentos"
              onClick={() => chips.current?.scrollBy({ left: chips.current.clientWidth * 0.7, behavior: "smooth" })}
            >
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </span>
            </button>
          )}
          </div>
        )}
      </div>

      <div id="fd-lista" role="tabpanel" aria-label={descricao} aria-busy={carregando}>
        {/* Antes de saber a tela, o servidor mostra as duas versões (o CSS esconde a que não serve) */}
        {(modo === null || modo === "pc") && estados.pc?.itens?.length > 0 && (
          <div className={modo === null ? "fd-so-pc" : undefined}>
            <GradePc ofertas={estados.pc.itens} />
          </div>
        )}
        {(modo === null || modo === "cel") && estados.cel?.itens?.length > 0 && (
          <div className={modo === null ? "fd-so-cel" : undefined}>
            <ListaCelular linhas={estados.cel.itens} />
          </div>
        )}

        {carregando && (
          <div className="fd-esqueletos" aria-label="Carregando ofertas">
            <div className="fd-esqueleto" />
            <div className="fd-esqueleto" />
            <div className="fd-esqueleto" />
            <div className="fd-esqueleto" />
          </div>
        )}

        {erro && (
          <div className="fd-aviso">
            Não deu para carregar as ofertas agora.
            <br />
            <button type="button" onClick={() => (ativo?.itens?.length ? carregarMais() : trocar(aba, depto))}>
              Tentar de novo
            </button>
          </div>
        )}

        {modo && !carregando && !erro && ativo && ativo.itens.length === 0 && (
          <p className="fd-aviso">Nenhuma oferta aqui agora. Veja as outras abas!</p>
        )}

        {ativo?.temMais && <div ref={marcador} aria-hidden="true" style={{ height: 1 }} />}
        {ativo?.temMais && !carregando && !erro && (
          <div className="fd-mais">
            <button type="button" onClick={carregarMais}>
              Carregar mais ofertas
            </button>
          </div>
        )}
        {modo && ativo && !ativo.temMais && ativo.itens.length > 0 && !carregando && (
          <p className="fd-fim">Você viu todas as ofertas desta aba. 🎉</p>
        )}
      </div>
    </section>
  );
}
