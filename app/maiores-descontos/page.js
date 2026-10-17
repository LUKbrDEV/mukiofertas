import AbasFeed from "../../components/AbasFeed";
import ListaOfertas from "../../components/ListaOfertas";
import { buscarOfertas, calcularDesconto } from "../../lib/ofertas";

export const revalidate = 60;
export const metadata = { title: "Maiores descontos - MukiOfertas" };

export default async function MaioresDescontos() {
  const ofertas = await buscarOfertas({ limite: 100 });
  ofertas.sort((a, b) => calcularDesconto(b) - calcularDesconto(a));

  return (
    <>
      <h1 className="so-leitor">Maiores descontos</h1>
      <AbasFeed />
      <ListaOfertas ofertas={ofertas.slice(0, 60)} />
    </>
  );
}