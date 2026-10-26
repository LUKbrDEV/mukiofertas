import ListaOfertas from "../components/ListaOfertas";
import FaixaRelampago from "../components/FaixaRelampago";
import { buscarOfertas, buscarMaisProcuradas } from "../lib/ofertas";

export const revalidate = 60;

export default async function Home() {
  const [ofertas, procuradas] = await Promise.all([buscarOfertas(), buscarMaisProcuradas(24)]);

  const relampagos = ofertas.filter((o) => o.relampago && !o.expirada).slice(0, 12);

  // Para não repetir o mesmo produto na tela, o que já aparece na faixa de relâmpago
  // não aparece de novo nos blocos de baixo
  const idsRelampago = new Set(relampagos.map((o) => o.id));
  const destaques = procuradas.filter((o) => !idsRelampago.has(o.id)).slice(0, 12);
  const idsMostrados = new Set([...idsRelampago, ...destaques.map((o) => o.id)]);
  const recentes = ofertas.filter((o) => !idsMostrados.has(o.id));

  return (
    <>
      <h1 className="so-leitor">Ofertas e promoções</h1>

      <FaixaRelampago ofertas={relampagos} />

      {destaques.length > 0 && (
        <section className="destaques" aria-labelledby="titulo-destaques">
          <h2 id="titulo-destaques" className="secao-titulo">
            🔥 Mais procuradas e maiores descontos
          </h2>
          <p className="secao-sub">As promoções que estão chamando mais atenção agora.</p>
          <ListaOfertas ofertas={destaques} />
        </section>
      )}

      <h2 className="secao-titulo">Todas as promoções adicionadas recentemente</h2>
      <p className="secao-sub">As ofertas mais novas aparecem primeiro.</p>
      <ListaOfertas ofertas={recentes} />
    </>
  );
}