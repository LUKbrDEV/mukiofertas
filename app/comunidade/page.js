import Link from "next/link";
import ListaOfertas from "../../components/ListaOfertas";
import { buscarOfertas } from "../../lib/ofertas";
import { ordenarOfertas } from "../../lib/ordenar";

export const revalidate = 60;
export const metadata = { title: "Promoções da Comunidade - MukiOfertas" };

export default async function Comunidade() {
  // Mais votadas e recentes primeiro (temperatura), as expiradas no fim
  const ofertas = ordenarOfertas(await buscarOfertas({ comunidade: true }), "em-alta");

  return (
    <>

      <ListaOfertas
        ofertas={ofertas}
        vazio="Ainda não há promoções da comunidade. Seja a primeira pessoa a enviar!"
      />
    </>
  );
}
