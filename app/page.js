import AbasFeed from "../components/AbasFeed";
import ListaOfertas from "../components/ListaOfertas";
import FaixaRelampago from "../components/FaixaRelampago";
import { buscarOfertas } from "../lib/ofertas";

export const revalidate = 60;

export default async function Home() {
  const ofertas = await buscarOfertas();
  const relampagos = ofertas.filter((o) => o.relampago).slice(0, 12);

  return (
    <>
      <h1 className="so-leitor">Ofertas e promoções</h1>
      <FaixaRelampago ofertas={relampagos} />
      <AbasFeed />
      <ListaOfertas ofertas={ofertas} />
    </>
  );
}