import Link from "next/link";
import LinhaOfertas from "../components/LinhaOfertas";
import BannerBlackFriday from "../components/BannerBlackFriday";
import FaixaRelampago from "../components/FaixaRelampago";
import SobreMuki from "../components/SobreMuki";
import { buscarOfertas, buscarMaisProcuradas } from "../lib/ofertas";

export const revalidate = 60;

export default async function Home() {
  const [relampagosNoAr, procuradas, recentes] = await Promise.all([
    buscarOfertas({ relampago: true, limite: 12, limiteExpiradas: 0 }),
    buscarMaisProcuradas(24),
    // As que entraram por último no site, sem dar prioridade às que estão em destaque
    buscarOfertas({ ordem: "recentes", limite: 24, limiteExpiradas: 0 }),
  ]);

  const relampagos = relampagosNoAr.filter((o) => !o.expirada).slice(0, 12);

  // Para não repetir o mesmo produto, o que já está na faixa de relâmpago
  // não aparece de novo em "Mais procuradas"
  const idsRelampago = new Set(relampagos.map((o) => o.id));
  const destaques = procuradas.filter((o) => !idsRelampago.has(o.id)).slice(0, 12);

  return (
    <>
      <h1 className="so-leitor">Ofertas e promoções</h1>

      <BannerBlackFriday />
      <FaixaRelampago ofertas={relampagos} />

      {destaques.length > 0 && (
        <section className="destaques" aria-labelledby="titulo-destaques">
          <div className="secao-cabecalho">
            <div>
              <h2 id="titulo-destaques" className="secao-titulo">
                🔥 Mais procuradas e maiores descontos
              </h2>
              <p className="secao-sub">As promoções que estão chamando mais atenção agora.</p>
            </div>
            <Link href="/mais-procuradas" className="botao-ver-mais">
              Ver mais →
            </Link>
          </div>
          <LinhaOfertas ofertas={destaques} />
        </section>
      )}

      {recentes.length > 0 && (
        <section className="destaques" aria-labelledby="titulo-recentes">
          <div className="secao-cabecalho">
            <div>
              <h2 id="titulo-recentes" className="secao-titulo">
                🆕 Promoções adicionadas recentemente
              </h2>
              <p className="secao-sub">As ofertas mais novas aparecem primeiro.</p>
            </div>
            <Link href="/recentes" className="botao-ver-mais">
              Ver todas →
            </Link>
          </div>
          <LinhaOfertas ofertas={recentes} />
        </section>
      )}

      <SobreMuki />
    </>
  );
}