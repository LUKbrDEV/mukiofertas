import Link from "next/link";
import ListaOfertas from "../../components/ListaOfertas";
import { buscarOfertas } from "../../lib/ofertas";

export const revalidate = 60;
export const metadata = { title: "Promoções da Comunidade - MukiOfertas" };

export default async function Comunidade() {
  const ofertas = await buscarOfertas({ comunidade: true });

  return (
    <>

      <ListaOfertas
        ofertas={ofertas}
        vazio="Ainda não há promoções da comunidade. Seja a primeira pessoa a enviar!"
      />
    </>
  );
}
