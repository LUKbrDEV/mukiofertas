// Faixa das lojas da página inicial.
//   Computador: "Ofertas verificadas das maiores lojas do Brasil" + frase + botões das lojas + "Ver todas as lojas >"
//   Celular: "Comece pela sua loja" + "Ver todas" e os botões arrastando para o lado
// As lojas e as cores vêm do data/lojas.js. Salve como components/LojasChips.js. Usado pelo app/page.js.

import { lojasDestaque } from "../data/lojas";

const CSS = `
  .lc { margin: 0 0 14px; padding: 16px 18px; background: #fff; border: 1px solid #e6e9ef; border-radius: 16px; }
  .lc-topo { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
  .lc-titulo { margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a; }
  .lc-sub { margin: 3px 0 0; font-size: 0.86rem; color: #475569; }
  .lc-cel { display: none; }
  .lc-lista { display: flex; gap: 10px; }
  .lc-loja {
    flex: 1 1 0; min-width: 0; display: inline-flex; align-items: center; justify-content: center;
    height: 46px; padding: 0 18px; border-radius: 10px;
    font-size: 0.95rem; font-weight: 700; white-space: nowrap; text-decoration: none;
    transition: transform .15s, box-shadow .15s;
  }
  .lc-loja:hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(15,23,42,.15); }
  .lc-todas { flex: 0 0 auto; min-width: auto; gap: 8px; background: #fff; color: #0f172a; border: 1px solid #e2e8f0; font-weight: 600; }
  .lc-todas:hover { border-color: #94a3b8; }
  @media (max-width: 899px) {
    .lc { padding: 12px 0; border-radius: 14px; margin-bottom: 10px; }
    .lc-topo { padding: 0 12px; margin-bottom: 8px; }
    .lc-pc { display: none; }
    .lc-cel { display: inline; }
    .lc-titulo { font-size: 0.98rem; }
    .lc-ver { font-size: 0.84rem; font-weight: 700; color: #1d5bd8; white-space: nowrap; }
    .lc-lista { flex-wrap: nowrap; gap: 8px; overflow-x: auto; scrollbar-width: none; scroll-snap-type: x proximity;
                scroll-padding-inline: 12px; padding: 0 12px 2px; }
    .lc-lista::-webkit-scrollbar { display: none; }
    .lc-loja { flex: none; scroll-snap-align: start; height: 38px; padding: 0 16px; font-size: 0.86rem; }
    .lc-todas { display: none; }
  }
`;

// Texto escuro em fundo claro (ex.: amarelo do Mercado Livre), branco no resto
function corDoTexto(hex) {
  const h = String(hex ?? "#000").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const luz = (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
  return luz > 160 ? "#1f2937" : "#fff";
}

export default function LojasChips() {
  return (
    <section className="lc" aria-labelledby="lc-titulo">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="lc-topo">
        <div>
          <h2 id="lc-titulo" className="lc-titulo">
            <span className="lc-pc">Ofertas verificadas das maiores lojas do Brasil</span>
            <span className="lc-cel">Comece pela sua loja</span>
          </h2>
          <p className="lc-sub lc-pc">
            Preço conferido o dia todo e compra direto na loja oficial. Comece pela sua loja favorita:
          </p>
        </div>
        <a className="lc-ver lc-cel" href="#todas-as-lojas">
          Ver todas
        </a>
      </div>
      <div className="lc-lista">
        {lojasDestaque.map((l) => (
          <a key={l.slug} href={`/loja/${l.slug}`} className="lc-loja" style={{ background: l.cor, color: corDoTexto(l.cor) }}>
            {l.nome}
          </a>
        ))}
        <a href="#todas-as-lojas" className="lc-loja lc-todas">
          Ver todas as lojas <span aria-hidden="true">›</span>
        </a>
      </div>
    </section>
  );
}
