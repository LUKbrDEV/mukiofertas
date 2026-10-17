import AbasFeed from "../../components/AbasFeed";
import ListaOfertas from "../../components/ListaOfertas";
import { buscarOfertas } from "../../lib/ofertas";

export const revalidate = 60;
export const metadata = { title: "Promoções relâmpago - MukiOfertas" };

export default async function Relampago() {
  const ofertas = await buscarOfertas({ relampago: true });

  return (
    <>
      <h1 className="so-leitor">Promoções relâmpago</h1>
      <AbasFeed />
      <ListaOfertas
        ofertas={ofertas}
        vazio="Nenhuma promoção relâmpago agora. Elas aparecem aqui assim que forem encontradas."
      />
    </>
  );
}