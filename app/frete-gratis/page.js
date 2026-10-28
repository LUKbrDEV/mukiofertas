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
      
    </>
  );
}