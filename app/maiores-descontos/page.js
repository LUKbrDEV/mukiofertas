import AbasFeed from "../../components/AbasFeed";
import ListaOfertas from "../../components/ListaOfertas";
import LojasAbas from "../../components/LojasAbas";
import { buscarOfertas, buscarLojas, calcularDesconto } from "../../lib/ofertas";

export const revalidate = 60;
export const metadata = { title: "Maiores descontos - MukiOfertas" };

export default async function MaioresDescontos() {
  const [ofertas, lojas] = await Promise.all([buscarOfertas({ limite: 100 }), buscarLojas()]);
  ofertas.sort((a, b) => calcularDesconto(b) - calcularDesconto(a));

  return (
    <>
      <h1 className="so-leitor">Maiores descontos</h1>
      <LojasAbas lojas={lojas} />
      <AbasFeed />
      <ListaOfertas ofertas={ofertas.slice(0, 60)} />
    </>
  );
}
