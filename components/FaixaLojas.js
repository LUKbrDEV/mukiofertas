"use client";

// Faixa com as logos das lojas na página inicial (acima de "Promoções relâmpago").
// Ao clicar numa loja, abre logo abaixo as categorias que têm ofertas daquela loja agora.
// Salve como components/FaixaLojas.js. As lojas ficam em data/lojas.js e as logos em public/lojas/.

import Link from "next/link";
import { useEffect, useState } from "react";

const CSS = `
  .fl { margin: 4px 0 28px; }
  .fl-titulo {
    margin: 0 0 12px;
    font-family: var(--fonte-titulo), system-ui, sans-serif;
    font-size: 1.15rem;
    font-weight: 800;
    color: #0f172a;
  }
  /* os cartões se esticam para ocupar a largura toda da tela */
  .fl-linha { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 18px; }

  /* Cartão quadrado: logo na cor da loja em cima, quantidade embaixo */
  .fl-loja, .fl-em-breve { box-sizing: border-box; }
  .fl-loja {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 120px;
    padding: 7px;
    border: 1px solid #e8edf3;
    border-radius: 20px;
    background: #fff;
    cursor: pointer;
    font: inherit;
    text-align: center;
    /* sombra suave na cor da loja */
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.06),
      0 14px 26px -14px var(--fl-sombra);
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }
  .fl-loja:hover {
    transform: translateY(-4px);
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.06),
      0 22px 34px -16px var(--fl-sombra);
  }
  .fl-loja:focus-visible { outline: 3px solid #0a4bb8; outline-offset: 3px; }
  .fl-loja[aria-expanded="true"] { border-color: #ff7a1a; box-shadow: 0 0 0 3px rgba(255, 122, 26, 0.25), 0 22px 34px -16px var(--fl-sombra); }

  .fl-logo {
    position: relative;
    flex: 1;
    display: grid;
    place-items: center;
    overflow: hidden;
    padding: 0 10px;
    border-radius: 14px;
    background: var(--fl-cor);
  }
  /* brilho discreto no canto, para dar profundidade */
  .fl-logo::before {
    content: "";
    position: absolute;
    top: -40%;
    right: -30%;
    width: 90%;
    height: 120%;
    border-radius: 50%;
    background: radial-gradient(closest-side, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0));
    pointer-events: none;
  }
  .fl-logo img {
    position: relative;
    display: block;
    max-width: 80%;
    max-height: 30px;
    width: auto;
    height: auto;
    object-fit: contain;
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.18));
  }

  /* Loja sem logo: nome escrito */
  .fl-nome {
    position: relative;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-family: var(--fonte-titulo), system-ui, sans-serif;
    font-size: 0.95rem;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.01em;
    color: #fff;
    text-align: center;
    overflow-wrap: anywhere;
  }

  /* Botão "Ver todas as lojas" */
  .fl-mais {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    height: 120px;
    padding: 10px;
    border: 1px solid #e8edf3;
    border-radius: 20px;
    background: #fff;
    font: inherit;
    color: #0f172a;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 14px 26px -16px rgba(15, 23, 42, 0.35);
    transition: transform 0.18s ease;
  }
  .fl-mais:hover { transform: translateY(-4px); }
  .fl-mais b { font-size: 1.4rem; color: #ff6a00; }
  .fl-mais span { font-size: 0.8rem; font-weight: 700; }

  .fl-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 30px;
    font-size: 0.78rem;
    font-weight: 700;
    color: #475569;
  }
  .fl-info b { font-size: 0.9rem; color: #0f172a; }
  .fl-info--breve { color: #94a3b8; }
  .fl-seta { font-size: 0.75rem; color: #94a3b8; transition: transform 0.18s ease; }
  .fl-loja[aria-expanded="true"] .fl-seta { transform: rotate(180deg); color: #ff7a1a; }

  /* "Mais lojas em breve" */
  .fl-em-breve {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    height: 120px;
    padding: 10px;
    border: 2px dashed #cbd5e1;
    border-radius: 20px;
    background: repeating-linear-gradient(135deg, rgba(148, 163, 184, 0.06) 0 10px, transparent 10px 20px);
    color: #64748b;
    text-align: center;
  }
  .fl-em-breve span {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 6px 14px -8px rgba(15, 23, 42, 0.35);
    font-size: 1.3rem;
    font-weight: 800;
    color: #ff7a1a;
  }
  .fl-em-breve strong { font-size: 0.82rem; color: #0f172a; }
  .fl-em-breve small { font-size: 0.7rem; line-height: 1.3; }

  .fl-painel {
    position: relative;
    margin-top: 16px;
    padding: 16px 18px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    box-shadow: 0 12px 28px -14px rgba(15, 23, 42, 0.25);
    animation: fl-abre 0.18s ease;
  }
  @keyframes fl-abre { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  .fl-painel-topo { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .fl-painel-topo h3 { margin: 0; font-size: 1rem; font-weight: 800; color: #0f172a; }
  .fl-painel-topo small { color: #64748b; font-weight: 600; }
  .fl-fechar {
    margin-left: auto;
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 50%;
    background: #f1f5f9;
    color: #0f172a;
    font-size: 1.1rem;
    cursor: pointer;
  }
  .fl-fechar:hover { background: #e2e8f0; }
  .fl-cats { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
  .fl-cat {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    font-size: 0.9rem;
    font-weight: 700;
    color: #0f172a;
    text-decoration: none;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
  }
  .fl-cat:hover { color: #ff6a00; border-color: #ff7a1a; background: #fff7f0; }
  .fl-cat b {
    min-width: 22px;
    padding: 1px 7px;
    font-size: 0.72rem;
    text-align: center;
    color: #475569;
    background: #e2e8f0;
    border-radius: 999px;
  }
  .fl-cat:hover b { color: #fff; background: #ff7a1a; }
  .fl-vazio { margin: 0; color: #64748b; }

  @media (max-width: 760px) {
    .fl-linha {
      display: flex;
      flex-wrap: nowrap;
      gap: 12px;
      overflow-x: auto;
      padding: 4px 2px 18px;
      margin: -4px -2px -8px;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
    }
    .fl-linha::-webkit-scrollbar { display: none; }
    .fl-loja, .fl-em-breve, .fl-mais { flex: 0 0 116px; width: 116px; height: 104px; border-radius: 16px; scroll-snap-align: start; }
    .fl-logo { border-radius: 12px; padding: 0 8px; }
    .fl-logo img { max-height: 22px; }
    .fl-info { height: 28px; font-size: 0.72rem; }
    .fl-painel-topo small { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .fl-loja, .fl-painel, .fl-seta { transition: none; animation: none; }
  }
`;

// Quantas lojas aparecem antes do botão "Ver todas"
const LIMITE = 9;

export default function FaixaLojas({ lojas }) {
  const [aberta, setAberta] = useState(null);
  const [todas, setTodas] = useState(false);

  // Fecha com Esc
  useEffect(() => {
    if (!aberta) return;
    const esc = (e) => e.key === "Escape" && setAberta(null);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberta]);

  if (!lojas?.length) return null;
  const loja = lojas.find((l) => l.slug === aberta);
  const escondidas = todas ? 0 : Math.max(0, lojas.length - LIMITE);
  const visiveis = escondidas ? lojas.slice(0, LIMITE) : lojas;

  return (
    <section className="fl" aria-labelledby="fl-titulo">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h2 id="fl-titulo" className="fl-titulo">
        Ofertas por loja
      </h2>

      <div className="fl-linha" style={{ "--fl-qtd": lojas.length }}>
        {visiveis.map((l) => (
          <button
            key={l.slug}
            type="button"
            className="fl-loja"
            style={{ "--fl-cor": l.cor, "--fl-sombra": `${l.cor}aa` }}
            aria-expanded={aberta === l.slug}
            aria-controls="fl-painel"
            aria-label={`${l.nome}: ver categorias com ofertas`}
            onClick={() => setAberta((a) => (a === l.slug ? null : l.slug))}
          >
            <span className="fl-logo">
              {l.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.logo} alt="" loading="eager" />
              ) : (
                <span className="fl-nome">{l.nome}</span>
              )}
            </span>
            {l.total > 0 ? (
              <span className="fl-info">
                <b>{l.total}</b> {l.total === 1 ? "oferta" : "ofertas"}
                <span className="fl-seta" aria-hidden="true">▼</span>
              </span>
            ) : (
              <span className="fl-info fl-info--breve">em breve</span>
            )}
          </button>
        ))}

        {escondidas > 0 ? (
          <button type="button" className="fl-mais" onClick={() => setTodas(true)}>
            <b>+{escondidas}</b>
            <span>Ver todas as lojas</span>
          </button>
        ) : (
          <div className="fl-em-breve" aria-label="Mais lojas em breve">
            <span aria-hidden="true">+</span>
            <strong>Mais lojas em breve</strong>
            <small>Novas parceiras chegando</small>
          </div>
        )}
      </div>

      {loja && (
        <div className="fl-painel" id="fl-painel" role="region" aria-label={`Categorias da ${loja.nome}`}>
          <div className="fl-painel-topo">
            <h3>Categorias com ofertas {loja.artigo ?? "da"} {loja.nome}</h3>
            {loja.total > 0 && (
              <small>
                {loja.total} {loja.total === 1 ? "oferta no ar" : "ofertas no ar"}
              </small>
            )}
            <button type="button" className="fl-fechar" onClick={() => setAberta(null)} aria-label="Fechar">
              ×
            </button>
          </div>

          {loja.categorias.length === 0 ? (
            <p className="fl-vazio">
              Ainda não há ofertas {loja.artigo ?? "da"} {loja.nome} no ar. Assim que aparecerem, as categorias
              ficam aqui.
            </p>
          ) : (
            <ul className="fl-cats">
              {loja.categorias.map((c) => (
                <li key={c.slug}>
                  <Link className="fl-cat" href={`/categoria/${c.slug}?loja=${loja.slug}`}>
                    <span aria-hidden="true">{c.emoji}</span>
                    {c.nome}
                    <b>{c.total}</b>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}