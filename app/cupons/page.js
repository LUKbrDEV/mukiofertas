import ListaOfertas from "../../components/ListaOfertas";
import { buscarOfertas } from "../../lib/ofertas";

export const revalidate = 60;
export const metadata = { title: "Ofertas com cupom - MukiOfertas" };

export default async function Cupons() {
  const ofertasComCupom = await buscarOfertas({ comCupom: true });

  return (
    <>
      <h1 className="titulo-pagina">Ofertas com cupom</h1>
      <p className="subtitulo-pagina">Copie o código do cupom e use na hora de pagar.</p>

      {ofertasComCupom.length === 0 ? (
        <p className="vazio">Nenhuma oferta com cupom agora. Novas ofertas aparecem aqui.</p>
      ) : (
        <ListaOfertas ofertas={ofertasComCupom} />
      )}
    </>
  );
}