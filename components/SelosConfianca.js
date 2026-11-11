// Faixa de confiança no fim da página inicial: Site seguro · Compra na loja oficial · Ofertas verificadas · Privacidade.
// Salve como components/SelosConfianca.js. Usado pelo app/page.js.

const CSS = `
  .sc { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin: 24px 0 0; padding: 20px 24px;
        border-radius: 16px; background: #0f2a6b; color: #fff; }
  .sc-item { display: flex; align-items: flex-start; gap: 10px; }
  .sc-item svg { flex: none; margin-top: 2px; color: #93b4f5; }
  .sc-item strong { display: block; font-size: 0.92rem; }
  .sc-item span { font-size: 0.8rem; color: #c7d2fe; }
  .sc-nota { grid-column: 1 / -1; margin: 4px 0 0; padding-top: 12px; border-top: 1px solid rgba(255,255,255,.14); font-size: 0.78rem; color: #c7d2fe; }
  @media (max-width: 899px) { .sc { grid-template-columns: 1fr 1fr; padding: 16px; gap: 14px; } }
`;

const ITENS = [
  ["Site seguro", "Conexão protegida (HTTPS)", <path key="a" d="M6 10V8a6 6 0 1 1 12 0v2M5 10h14v10H5z" />],
  ["Compra na loja oficial", "Você paga direto no site da loja", <path key="b" d="M4 7h16l-1 13H5zM9 7a3 3 0 0 1 6 0" />],
  ["Ofertas verificadas", "Preço conferido ao longo do dia", <path key="c" d="m5 12 4 4 10-10" />],
  ["Privacidade (LGPD)", "Seus dados protegidos", <path key="d" d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />],
];

export default function SelosConfianca() {
  return (
    <section className="sc" aria-label="Por que comprar pelo MukiOfertas">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {ITENS.map(([titulo, texto, icone]) => (
        <div key={titulo} className="sc-item">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {icone}
          </svg>
          <div>
            <strong>{titulo}</strong>
            <span>{texto}</span>
          </div>
        </div>
      ))}
      <p className="sc-nota">O MukiOfertas pode receber comissão pelas compras feitas pelos links, sem custo extra para você.</p>
    </section>
  );
}
