import CardCupom from "../../components/CardCupom";
import ListaOfertas from "../../components/ListaOfertas";
import { buscarCupons, buscarOfertas } from "../../lib/ofertas";

export const revalidate = 60;
export const metadata = { title: "Cupons de desconto - MukiOfertas" };

export default async function Cupons() {
  const [cupons, ofertasComCupom] = await Promise.all([
    buscarCupons(),
    buscarOfertas({ comCupom: true }),
  ]);

  return (
    <>
      <h1 className="titulo-pagina">Cupons de desconto</h1>
      <p className="subtitulo-pagina">Copie o código e use na hora de pagar.</p>

      {cupons.length === 0 ? (
        <p className="vazio">Nenhum cupom ativo agora. Novos cupons aparecem aqui.</p>
      ) : (
        <div className="grade-cupons">
          {cupons.map((cupom) => (
            <CardCupom key={cupom.id} cupom={cupom} />
          ))}
        </div>
      )}

      {ofertasComCupom.length > 0 && (
        <section className="secao">
          <h2 className="titulo-secao">Ofertas com cupom</h2>
          <ListaOfertas ofertas={ofertasComCupom} />
        </section>
      )}
    </>
  );
}
