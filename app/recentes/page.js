// Página "Todas as promoções adicionadas recentemente" (https://www.mukiofertas.com.br/recentes)
// Salve como app/recentes/page.js (crie a pasta "recentes" dentro de "app").

import ListaOfertas from "../../components/ListaOfertas";
import { buscarOfertas } from "../../lib/ofertas";

export const revalidate = 60;

export const metadata = {
  title: "Promoções adicionadas recentemente | MukiOfertas",
  description:
    "As ofertas e promoções mais novas do MukiOfertas, na ordem em que entraram no site, atualizadas o dia todo.",
  alternates: { canonical: "/recentes" },
};

export default async function PaginaRecentes() {
  const ofertas = await buscarOfertas({ ordem: "recentes", limite: 120, limiteExpiradas: 0 });

  return (
    <>
      <h1 className="titulo-pagina">Promoções adicionadas recentemente</h1>
      <p className="subtitulo-pagina">As ofertas mais novas aparecem primeiro.</p>
      <ListaOfertas
        ofertas={ofertas}
        vazio="Nenhuma oferta no ar agora. Novas ofertas aparecem assim que forem encontradas."
      />
    </>
  );
}