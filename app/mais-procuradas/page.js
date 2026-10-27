import ListaOfertas from "../../components/ListaOfertas";
import { buscarMaisProcuradas } from "../../lib/ofertas";

export const revalidate = 60;

export const metadata = {
  title: "Mais procuradas e maiores descontos | MukiOfertas",
  description: "As promoções com os maiores descontos e mais procuradas das maiores lojas do Brasil.",
  alternates: { canonical: "/mais-procuradas" },
};

export default async function MaisProcuradas() {
  const ofertas = await buscarMaisProcuradas(60);

  return (
    <>
      <h1 className="titulo-pagina">🔥 Mais procuradas e maiores descontos</h1>
      <p className="subtitulo-pagina">As promoções que estão chamando mais atenção agora.</p>
      <ListaOfertas
        ofertas={ofertas}
        vazio="Nenhuma oferta em destaque agora. Novas ofertas aparecem assim que forem encontradas."
      />
    </>
  );
}