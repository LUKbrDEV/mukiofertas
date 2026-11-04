// Divide a página inicial em duas colunas: as ofertas à esquerda e o ranking fixo à direita.
// Salve como components/HomeComRanking.js. Usado pelo app/page.js.
// Em telas menores que 1200px o ranking vai para o fim da lista de ofertas.

import RankingLateral from "./RankingLateral";

const CSS = `
  .home-grade { display: grid; grid-template-columns: minmax(0, 1fr) 236px; gap: 22px; align-items: start; }
  .home-grade-principal { min-width: 0; }
  .home-grade-lateral { position: sticky; top: 16px; margin-top: 18px; }
  @media (max-width: 1199px) {
    .home-grade { grid-template-columns: minmax(0, 1fr); }
    .home-grade-lateral { position: static; max-width: 420px; width: 100%; margin: 8px auto 0; }
  }
`;

export default function HomeComRanking({ children }) {
  return (
    <div className="home-grade">
      <style>{CSS}</style>
      <div className="home-grade-principal">{children}</div>
      <div className="home-grade-lateral">
        <RankingLateral limite={5} />
      </div>
    </div>
  );
}
