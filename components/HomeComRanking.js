// Divide a página inicial em duas colunas: as ofertas à esquerda e os rankings fixos à direita.
// Salve como components/HomeComRanking.js. Usado pelo app/page.js.
// Em telas menores que 1200px os rankings vão para o fim da lista de ofertas.
// --mk-topo-fixo é a altura do cabeçalho preso no topo (medida pelo RankingLateral),
// para o ranking parar logo abaixo dele e não ficar escondido.

import RankingLateral from "./RankingLateral";

const CSS = `
  .home-grade { display: grid; grid-template-columns: minmax(0, 1fr) 236px; gap: 22px; align-items: start; }
  .home-grade-principal { min-width: 0; }
  .home-grade-lateral {
    position: sticky;
    top: calc(var(--mk-topo-fixo, 0px) + 14px);
    margin-top: 18px;
    max-height: calc(100vh - var(--mk-topo-fixo, 0px) - 28px);
    overflow-y: auto;
    scrollbar-width: thin;
    transition: top .15s ease;
  }
  @media (max-width: 1199px) {
    .home-grade { grid-template-columns: minmax(0, 1fr); }
    .home-grade-lateral { position: static; max-height: none; overflow: visible; max-width: 420px; width: 100%; margin: 8px auto 0; }
  }
`;

// extra = caixas que aparecem abaixo do ranking (canais, guias...)
export default function HomeComRanking({ children, extra = null }) {
  return (
    <div className="home-grade">
      <style>{CSS}</style>
      <div className="home-grade-principal">{children}</div>
      <div className="home-grade-lateral">
        <RankingLateral limite={5} />
        {extra}
      </div>
    </div>
  );
}
