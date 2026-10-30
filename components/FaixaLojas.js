"use client";

// Faixa com as logos das lojas na página inicial (acima de "Promoções relâmpago").
// Ao clicar numa loja, abre logo abaixo as categorias que têm ofertas daquela loja agora.
// Salve como components/FaixaLojas.js. As lojas ficam em data/lojas.js e as logos em public/lojas/.

import Link from "next/link";
import { useEffect, useState } from "react";

const CSS = `
  .fl { margin: 4px 0 26px; }
  .fl-titulo {
    margin: 0 0 10px;
    font-family: var(--fonte-titulo), system-ui, sans-serif;
    font-size: 1.15rem;
    font-weight: 800;
    color: #0f172a;
  }
  .fl-linha {
    display: grid;
    grid-template-columns: repeat(var(--fl-qtd), minmax(0, 1fr));
    gap: 12px;
  }
  .fl-loja {
    position: relative;
    display: grid;
    place-items: center;
    height: 56px;
    padding: 6px 14px;
    border: 0;
    border-radius: 14px;
    background: var(--fl-cor);
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.1);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .fl-loja:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(15, 23, 42, 0.16); }
  .fl-loja:focus-visible { outline: 3px solid #0a4bb8; outline-offset: 3px; }
  .fl-loja[aria-expanded="true"] { box-shadow: 0 0 0 3px #fff, 0 0 0 6px #ff7a1a; }
  .fl-loja[aria-expanded="true"]::after {
    content: "";
    position: absolute;
    left: 50%;
    bottom: -15px;
    width: 14px;
    height: 14px;
    background: #fff;
    border-left: 1px solid #e2e8f0;
    border-top: 1px solid #e2e8f0;
    transform: translateX(-50%) rotate(45deg);
    z-index: 2;
  }
  .fl-loja img { display: block; max-width: 100%; max-height: 38px; width: auto; height: auto; object-fit: contain; }
  .fl-qtd {
    position: absolute;
    top: -8px;
    right: -6px;
    min-width: 24px;
    padding: 2px 7px;
    font-size: 0.7rem;
    font-weight: 800;
    color: #fff;
    background: #0f172a;
    border: 2px solid #fff;
    border-radius: 999px;
  }
  .fl-qtd--breve { background: #64748b; }

  .fl-painel {
    position: relative;
    margin-top: 14px;
    padding: 16px 18px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
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
      overflow-x: auto;
      padding: 8px 2px 10px;
      margin: -8px -2px 0;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
    }
    .fl-linha::-webkit-scrollbar { display: none; }
    .fl-loja { flex: 0 0 160px; height: 52px; padding: 6px 10px; scroll-snap-align: start; }
    .fl-loja img { max-height: 32px; }
    .fl-loja[aria-expanded="true"]::after { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .fl-loja, .fl-painel { transition: none; animation: none; }
  }
`;

export default function FaixaLojas({ lojas }) {
  const [aberta, setAberta] = useState(null);

  // Fecha com Esc
  useEffect(() => {
    if (!aberta) return;
    const esc = (e) => e.key === "Escape" && setAberta(null);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberta]);

  if (!lojas?.length) return null;
  const loja = lojas.find((l) => l.slug === aberta);

  return (
    <section className="fl" aria-labelledby="fl-titulo">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h2 id="fl-titulo" className="fl-titulo">
        Ofertas por loja
      </h2>

      <div className="fl-linha" style={{ "--fl-qtd": lojas.length }}>
        {lojas.map((l) => (
          <button
            key={l.slug}
            type="button"
            className="fl-loja"
            style={{ "--fl-cor": l.cor }}
            aria-expanded={aberta === l.slug}
            aria-controls="fl-painel"
            aria-label={`${l.nome}: ver categorias com ofertas`}
            onClick={() => setAberta((a) => (a === l.slug ? null : l.slug))}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.logo} alt="" width="180" height="38" loading="eager" />
            {l.total > 0 ? (
              <span className="fl-qtd">{l.total > 99 ? "99+" : l.total}</span>
            ) : (
              <span className="fl-qtd fl-qtd--breve">em breve</span>
            )}
          </button>
        ))}
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
