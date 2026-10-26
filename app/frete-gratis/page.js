import ListaOfertas from "../../components/ListaOfertas";
import { buscarOfertas } from "../../lib/ofertas";

export const revalidate = 60;

export const metadata = {
  title: "Frete grátis | MukiOfertas",
  description: "Promoções com frete grátis nas maiores lojas do Brasil.",
  alternates: { canonical: "/frete-gratis" },
};

export default async function FreteGratis() {
  const ofertas = await buscarOfertas({ freteGratis: true });

  return (
    <>
      <h1 className="titulo-pagina">🚚 Frete grátis</h1>
      <p className="subtitulo-pagina">
        Quem não quer economizar no frete? Aqui estão as ofertas com frete grátis nas maiores lojas do Brasil.
      </p>
      <ListaOfertas
        ofertas={ofertas}
        vazio="Nenhuma oferta com frete grátis agora. Novas ofertas aparecem assim que forem encontradas."
      />
    </>
  );
}