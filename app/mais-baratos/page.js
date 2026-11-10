// Página "Mais baratos" (https://www.mukiofertas.com.br/mais-baratos)
// Até R$ 100, do mais barato para o mais caro, só com desconto de verdade (regra em lib/vitrine.mjs).
// Salve como app/mais-baratos/page.js (crie a pasta "mais-baratos" dentro de "app").

import ListaOfertas from "../../components/ListaOfertas";
import { buscarOfertas, buscarConfigHome } from "../../lib/ofertas";
import { regrasDaVitrine, maisBaratos } from "../../lib/vitrine.mjs";

export const revalidate = 60;

export const metadata = {
  title: "Ofertas mais baratas: achadinhos até R$ 100 | MukiOfertas",
  description:
    "Achadinhos até R$ 100 com desconto de verdade nas maiores lojas do Brasil, do mais barato para o mais caro. Atualizado o dia todo.",
  alternates: { canonical: "/mais-baratos" },
};

export default async function PaginaMaisBaratos() {
  const [todas, config] = await Promise.all([
    buscarOfertas({ limite: 1000, limiteExpiradas: 0 }),
    buscarConfigHome(),
  ]);
  const r = regrasDaVitrine(config);
  // aqui pode repetir mais loja e categoria do que na faixa da página inicial
  const ofertas = maisBaratos(todas, { ...r, home_max_por_categoria: 12, home_max_por_loja: 60 }, { maximo: 120 });

  return (
    <>
      <h1 className="titulo-pagina">🪙 Mais baratos: achadinhos até R$ 100</h1>
      <p className="subtitulo-pagina">Do mais barato para o mais caro, só com desconto de verdade.</p>
      <ListaOfertas
        ofertas={ofertas}
        vazio="Nenhum achadinho no ar agora. Novas ofertas aparecem assim que forem encontradas."
      />
    </>
  );
}
