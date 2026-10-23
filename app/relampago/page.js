import AbasFeed from "../../components/AbasFeed";
import ListaOfertas from "../../components/ListaOfertas";
import LojasAbas from "../../components/LojasAbas";
import { buscarOfertas, buscarLojas } from "../../lib/ofertas";

export const revalidate = 60;
export const metadata = { title: "Promoções relâmpago - MukiOfertas" };

export default async function Relampago() {
  const [ofertas, lojas] = await Promise.all([buscarOfertas({ relampago: true }), buscarLojas()]);

  return (
    <>
      <h1 className="so-leitor">Promoções relâmpago</h1>
      <LojasAbas lojas={lojas} />
      <AbasFeed />
      <ListaOfertas
        ofertas={ofertas}
        vazio="Nenhuma promoção relâmpago agora. Elas aparecem aqui assim que forem encontradas."
      />
    </>
  );
}
