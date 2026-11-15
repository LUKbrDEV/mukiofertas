// Estilo das páginas da compra em grupo. Salve como components/compra-em-grupo/estilo.js.
export const CSS_GRUPO = `
  .cg-topo { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
  .cg-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 10px 18px; border-radius: 10px; border: 1px solid transparent;
    font-weight: 800; font-size: 0.95rem; text-decoration: none; cursor: pointer;
    background: #ff6a00; color: #fff; transition: filter .15s;
  }
  .cg-btn:hover { filter: brightness(1.07); }
  .cg-btn:disabled { opacity: .6; cursor: default; }
  .cg-btn--claro { background: #fff; color: #0f172a; border-color: #e2e8f0; }
  .cg-btn--claro:hover { border-color: #ff7a1a; color: #ff6a00; filter: none; }
  .cg-btn--pequeno { padding: 6px 12px; font-size: 0.82rem; font-weight: 700; border-radius: 8px; }

  .cg-como { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 14px 0 18px; }
  .cg-como div { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 14px; font-size: 0.9rem; color: #334155; }
  .cg-como strong { display: block; color: #0f172a; margin-bottom: 2px; }

  .cg-filtros { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 18px; }
  .cg-filtros a {
    padding: 6px 14px; font-size: 0.88rem; font-weight: 700; color: #0f172a; text-decoration: none;
    background: #fff; border: 1px solid #e2e8f0; border-radius: 999px;
  }
  .cg-filtros a:hover { border-color: #ff7a1a; color: #ff6a00; }
  .cg-filtros a[aria-current="page"] { color: #fff; background: #ff6a00; border-color: #ff6a00; }

  .cg-grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; }
  .cg-card {
    display: flex; flex-direction: column; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
    overflow: hidden; text-decoration: none; color: inherit; transition: box-shadow .15s, border-color .15s;
  }
  .cg-card:hover { border-color: #ffb27a; box-shadow: 0 6px 18px rgba(15, 23, 42, .08); }
  .cg-card-foto { aspect-ratio: 1; background: #f8fafc; display: grid; place-items: center; }
  .cg-card-foto img { width: 100%; height: 100%; object-fit: contain; }
  .cg-card-corpo { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
  .cg-card-titulo {
    font-size: 0.9rem; line-height: 1.3; color: #0f172a; margin: 0;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .cg-preco { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px; }
  .cg-preco strong { font-size: 1.2rem; color: #0f172a; }
  .cg-preco s { color: #94a3b8; font-size: 0.82rem; }
  .cg-preco .cg-off { color: #16a34a; font-weight: 800; font-size: 0.8rem; }
  .cg-rotulo { font-size: 0.72rem; color: #64748b; text-transform: uppercase; letter-spacing: .03em; font-weight: 700; }
  .cg-status {
    margin-top: auto; align-self: flex-start; padding: 4px 10px; border-radius: 999px;
    font-size: 0.78rem; font-weight: 800; background: #f1f5f9; color: #475569;
  }
  .cg-status--1 { background: #dcfce7; color: #15803d; }
  .cg-status--2 { background: #fff7ed; color: #c2410c; }

  .cg-produto { display: grid; grid-template-columns: minmax(0, 340px) minmax(0, 1fr); gap: 28px; background: #fff;
    border: 1px solid #e5e7eb; border-radius: 16px; padding: 22px; }
  .cg-produto-foto { background: #f8fafc; border-radius: 12px; aspect-ratio: 1; display: grid; place-items: center; overflow: hidden; }
  .cg-produto-foto img { width: 100%; height: 100%; object-fit: contain; }
  .cg-produto h1 { font-size: 1.5rem; font-weight: 800; line-height: 1.25; margin: 0 0 10px; color: #0f172a; }
  .cg-produto .cg-preco strong { font-size: 1.8rem; }
  .cg-numeros { display: flex; gap: 14px; flex-wrap: wrap; color: #64748b; font-size: 0.85rem; margin: 8px 0 16px; }

  .cg-grupos { display: flex; flex-direction: column; gap: 10px; margin: 6px 0 14px; }
  .cg-grupo {
    display: flex; flex-wrap: wrap; align-items: center; gap: 10px; justify-content: space-between;
    padding: 12px 14px; border: 1px solid #fed7aa; background: #fffaf5; border-radius: 12px;
  }
  .cg-grupo-info { display: flex; flex-direction: column; gap: 2px; font-size: 0.85rem; color: #64748b; }
  .cg-grupo-info strong { font-size: 1rem; color: #c2410c; }
  .cg-grupo-acoes { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .cg-sem-grupo { padding: 14px; border: 2px dashed #ffb27a; border-radius: 12px; background: #fff; color: #334155; }

  .cg-secao { margin-top: 24px; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px 22px; }
  .cg-secao h2 { font-size: 1.15rem; margin: 0 0 12px; color: #0f172a; }
  .cg-faq details { border-bottom: 1px solid #eef2f7; padding: 10px 0; }
  .cg-faq details:last-child { border-bottom: none; }
  .cg-faq summary { cursor: pointer; font-weight: 700; color: #0f172a; }
  .cg-faq p { margin: 8px 0 0; color: #334155; line-height: 1.55; }
  .cg-aviso { font-size: 0.8rem; color: #64748b; margin-top: 10px; }

  .cg-form { display: flex; flex-direction: column; gap: 14px; max-width: 620px; background: #fff;
    border: 1px solid #e5e7eb; border-radius: 16px; padding: 22px; }
  .cg-form label { display: flex; flex-direction: column; gap: 6px; font-weight: 700; color: #0f172a; font-size: 0.92rem; }
  .cg-form small { font-weight: 400; color: #64748b; }
  .cg-form input, .cg-form select {
    padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 1rem; font-weight: 400;
  }
  .cg-form input:focus, .cg-form select:focus { outline: 2px solid #ffb27a; border-color: #ff7a1a; }
  .cg-erro { color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; padding: 10px 12px; border-radius: 10px; margin: 0; }
  .cg-ok { color: #166534; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 12px; border-radius: 10px; margin: 0; }

  /* ===== Página do produto (coluna da direita) ===== */
  .cg-coluna { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
  .cg-coluna h1 { margin: 0; }
  .cg-numeros { margin: 0; }
  .cg-numeros span { display: inline-flex; align-items: center; gap: 5px; }
  .cg-faixa {
    display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 12px;
    background: #f1f5f9; color: #475569; font-size: 0.9rem; line-height: 1.5;
  }
  .cg-faixa strong { color: #0f172a; }
  .cg-faixa--aberto { background: #ecfdf5; color: #166534; }
  .cg-faixa--aberto strong { color: #14532d; }
  .cg-faixa-icone { flex: none; font-size: 1.1rem; line-height: 1.3; }

  .cg-precobox { border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px 16px; background: #fff; }
  .cg-precobox-linha { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
  .cg-precobox-preco { font-size: 2.4rem; font-weight: 900; color: #ea580c; letter-spacing: -0.02em; line-height: 1.1; }
  .cg-precobox s { color: #94a3b8; font-size: 1rem; }
  .cg-badge { background: #c2410c; color: #fff; font-weight: 800; font-size: 0.85rem; padding: 3px 8px; border-radius: 7px; }
  .cg-mono {
    margin-top: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.72rem; letter-spacing: .06em; text-transform: uppercase; color: #64748b; line-height: 1.6;
  }

  .cg-cta {
    display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;
    padding: 16px 18px; border-radius: 12px; background: #ea580c; color: #fff; font-size: 1.05rem;
    font-weight: 800; text-decoration: none; box-shadow: 0 6px 16px rgba(234, 88, 12, .25); transition: filter .15s;
  }
  .cg-cta:hover { filter: brightness(1.06); }
  .cg-cta small { font-weight: 600; opacity: .9; }

  .cg-caixa { border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px; background: #fff; }
  .cg-caixa-titulo { display: block; color: #0f172a; font-size: 1rem; margin-bottom: 4px; }
  .cg-caixa-texto { margin: 0 0 12px; color: #64748b; font-size: 0.86rem; }
  .cg-passos { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; counter-reset: passo; }
  .cg-passos li { display: grid; grid-template-columns: 26px 1fr; gap: 10px; color: #334155; font-size: 0.9rem; line-height: 1.5; counter-increment: passo; }
  .cg-passos li::before { content: counter(passo); color: #ea580c; font-weight: 900; }

  .cg-colar { display: flex; flex-wrap: wrap; gap: 8px; }
  .cg-colar-campo { flex: 1 1 220px; display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; }
  .cg-colar-campo:focus-within { outline: 2px solid #ffb27a; border-color: #ff7a1a; }
  .cg-colar-campo input { flex: 1; min-width: 0; border: 0; outline: 0; padding: 11px 12px; font-size: 0.95rem; background: transparent; }
  .cg-colar-icone { border: 0; background: none; color: #64748b; padding: 8px 10px; cursor: pointer; }
  .cg-colar-icone:hover { color: #ea580c; }
  .cg-colar-faltam { border: 1px solid #cbd5e1; border-radius: 10px; padding: 0 10px; font-size: 0.9rem; background: #fff; }
  .cg-colar .cg-btn { background: #ea580c; }

  .cg-btn--contorno { background: #fff; color: #0f172a; border-color: #cbd5e1; font-weight: 700; }
  .cg-btn--contorno:hover { border-color: #ea580c; color: #ea580c; filter: none; }
  .cg-btn--largo { width: 100%; padding: 13px 16px; }
  .cg-btn--ligado { background: #ecfdf5; border-color: #86efac; color: #166534; }

  @media (max-width: 760px) {
    .cg-precobox-preco { font-size: 2rem; }
    .cg-produto { grid-template-columns: minmax(0, 1fr); padding: 16px; gap: 16px; }
    .cg-grade { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
  }
`;
